import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/* ---------------- UNIVERSAL JUNK FILTER ---------------- */
const JUNK_LINE_REGEX = new RegExp(
  [
    "registration","reg\\.? no","roll no","seat no","candidate name","student name",
    "hall ticket","admit card","uid","enrollment",
    "^page\\s*\\d+","total number of pages","paper code","question paper code",
    "q code","set\\s*[a-z0-9]+","series\\s*[a-z0-9]+","version\\s*[a-z0-9]+","model paper",
    "time\\s*[:=]","duration","max(imum)? marks","full marks","pass marks",
    "cbse","icse","state board","ssc","hsc","ncert","university","autonomous",
    "class\\s*(vi|vii|viii|ix|x|6|7|8|9|10)","semester","year","course","programme","program",
    "branch","b\\.tech","m\\.tech","b\\.sc","m\\.sc","bca","mca","mba",
    "answer all","answer any","attempt all","attempt any","instructions",
    "figures in the right hand margin","use of calculator","neat diagram","assume suitable",
    "^part\\s*[-:]?\\s*[a-z0-9ivx]+","^section\\s*[-:]?\\s*[a-z0-9ivx]+",
    "co\\s*level","course outcome","blooms","bt level","learning outcome",
    "short answer type","long answer type","very short answer","objective type",
    "multiple choice","mcq","fill in the blanks","true or false","match the following",
    "negative marking","assertion reason","numerical value",
    "—+","_+","\\*+","\\|+","={2,}","-{2,}",
    "^\\d+$","^[a-z]$","^[ivx]+$"
  ].join("|"),
  "i"
);

/* ---------------- CLEAN EXAM QUESTIONS ---------------- */
function cleanExamText(rawText) {
  return rawText
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 5)
    .filter(l => !JUNK_LINE_REGEX.test(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join("\n");
}

/* ---------------- PROMPT SANITIZER ---------------- */
function sanitizePrompt(prompt) {
  return prompt
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/-+\n/g, "")
    .trim();
}

/* ---------------- ZOD SCHEMAS ---------------- */
const priorityEnum = z.enum(["high", "medium", "low"]);
const difficultyEnum = z.enum(["easy", "moderate", "hard"]);

export const AnalysisSchema = z.object({
  subject: z.string().min(1),
  topics: z
    .array(
      z.object({
        main_topic: z.string().min(1),
        priority: priorityEnum,
        difficulty: difficultyEnum,
        side_topics: z.array(z.string().min(1)).max(3),
        topic_query: z.string().min(1),
        playlist_query: z.string().min(1),
        definition: z.string().min(1),
        question_types: z.array(z.string().min(1)).min(3)
      })
    )
    .min(15)
    .max(25)
});

export const QuizSchema = z.object({
  subject: z.string().min(1),
  quiz: z
    .array(
      z.object({
        question: z.string().min(5),
        options: z.array(z.string().min(1)).length(4),
        answerIndex: z.number().int().min(0).max(3),
        topic: z.string().min(1),
        difficulty: difficultyEnum
      })
    )
    .min(15)
    .max(25)
    .superRefine((quiz, ctx) => {
      const seen = new Set();
      quiz.forEach((item, index) => {
        const key = item.question.trim().toLowerCase();
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "question"],
            message: "Duplicate question detected"
          });
        }
        seen.add(key);

        const options = item.options.map(o => o.trim().toLowerCase());
        if (new Set(options).size !== options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "options"],
            message: "Options must be unique"
          });
        }
      });
    })
});

/* ---------------- ZOD -> GEMINI RESPONSE SCHEMA ---------------- */
const UNSUPPORTED_JSON_SCHEMA_KEYS = new Set([
  "$schema", "minLength", "maxLength", "pattern", "const", "default",
  "examples", "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
  "minProperties", "maxProperties", "uniqueItems", "multipleOf",
  "exclusiveMinimum", "exclusiveMaximum", "dependentRequired",
  "dependentSchemas", "propertyNames", "unevaluatedProperties", "unevaluatedItems",
  "additionalProperties", "additionalItems"
]);

function pruneGeminiSchema(node) {
  if (Array.isArray(node)) return node.map(pruneGeminiSchema);
  if (node && typeof node === "object") {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_JSON_SCHEMA_KEYS.has(key)) continue;
      out[key] = pruneGeminiSchema(value);
    }
    return out;
  }
  return node;
}

export function toGeminiResponseSchema(zodSchema) {
  return pruneGeminiSchema(z.toJSONSchema(zodSchema));
}

/* ---------------- STRUCTURED GENERATION + ZOD VALIDATION ---------------- */
function extractJson(raw) {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^[^{[]*/, "")
    .replace(/[^}\]]*$/, "")
    .trim();
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 529]);
let USE_RESPONSE_SCHEMA = true;

async function callGemini(contents, responseSchema) {
  let schema = USE_RESPONSE_SCHEMA ? responseSchema : undefined;
  let lastError;
  for (let tryNum = 0; tryNum < 4; tryNum++) {
    try {
      const config = {
        temperature: 0.2,
        responseMimeType: "application/json"
      };
      if (schema) config.responseJsonSchema = schema;

      return await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config
      });
    } catch (err) {
      const status = Number(err?.status ?? err?.code);
      lastError = err;

      if (status === 400 && schema) {
        console.warn("[Gemini] responseJsonSchema rejected by API (400), falling back to prompt-only JSON mode");
        USE_RESPONSE_SCHEMA = false;
        schema = undefined;
        continue;
      }

      if (!RETRYABLE_STATUSES.has(status)) throw err;
      console.warn(`[Gemini] transient ${status}, retry ${tryNum + 1}/4...`);
      await new Promise(r => setTimeout(r, 1500 * (tryNum + 1)));
    }
  }
  throw lastError;
}

async function generateStructured({ prompt, schema, retries = 2 }) {
  const responseSchema = toGeminiResponseSchema(schema);
  let lastError = "unknown validation error";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const contents =
      attempt === 0
        ? prompt
        : `${prompt}\n\nPREVIOUS ATTEMPT FAILED ZOD VALIDATION:\n${lastError}\nReturn corrected JSON only. No prose, no markdown.`;

    const response = await callGemini(contents, responseSchema);

    const raw = (response.text || "").trim();
    if (!raw) {
      lastError = "Model returned an empty response";
      continue;
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(extractJson(raw));
    } catch (err) {
      lastError = `Invalid JSON: ${err.message}`;
      continue;
    }

    const result = schema.safeParse(parsedJson);
    if (result.success) {
      return result.data;
    }

    lastError = result.error.issues
      .map(issue => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    console.warn(`[Gemini] validation failed (attempt ${attempt + 1}): ${lastError}`);
  }

  throw new Error(`Gemini output failed Zod validation: ${lastError}`);
}

/* ---------------- EXAM PATTERN ANALYSIS ---------------- */
export async function analyzeExamText(finalText, syllabusText) {
  if (!finalText || typeof finalText !== "string") {
    throw new Error("Invalid exam text");
  }

  const cleanedExamText = cleanExamText(finalText);

  if (!cleanedExamText) {
    throw new Error("No valid exam questions found after cleaning");
  }

  const rawPrompt = `
You are an EXAM QUESTION PATTERN EXTRACTION ASSISTANT.

INPUT
- EXAM PAPER TEXT (required)
- SYLLABUS TEXT (optional)

OBJECTIVE
Extract REPEATED, MARKS-ORIENTED EXAM QUESTION PATTERNS.
Do NOT extract chapters or abstract themes.

CORE CONSTRAINT
Each main_topic must be a QUESTION-SOLVING UNIT suitable for a 5–15 mark exam
(derivable / constructible / traceable / implementable).
Abstract concepts allowed ONLY as side_topics.

RULES
1. Provide AT LEAST 15 main_topic entries (15 is the hard minimum, go up to 20 when the paper supports it).
2. Sort topics from foundational → advanced.
3. Each main_topic: ≤3 minimal prerequisites (≤10 min learnable).
4. If syllabus exists → ONLY syllabus-aligned topics.
5. If no syllabus → infer from repetition & phrasing.
6. Merge equivalent question patterns.
7. Ignore instructions, marks, sections, and rare theory-only questions.

FOR EACH MAIN_TOPIC RETURN
- priority: high | medium | low
- difficulty: easy | moderate | hard
- definition: ~30 words (exam-solving strategy)
- side_topics: ≤3
- topic_query
- playlist_query
- question_types: 3 realistic exam-style patterns

STRICT OUTPUT
- Question-solving topics only
- ≤3 side_topics
- No invented syllabus content
- Output ONLY valid JSON matching the required schema
- No explanations, markdown, or comments

OUTPUT FORMAT
{
  "subject": "<string>",
  "topics": [
    {
      "main_topic": "",
      "priority": "high|medium|low",
      "difficulty": "easy|moderate|hard",
      "side_topics": [],
      "topic_query": "",
      "playlist_query": "",
      "definition": "",
      "question_types": []
    }
  ]
}

SYLLABUS TEXT:
${syllabusText}

EXAM QUESTIONS:
${cleanedExamText}
`;

  const finalPrompt = sanitizePrompt(rawPrompt);

  const parsed = await generateStructured({
    prompt: finalPrompt,
    schema: AnalysisSchema
  });

  parsed.topics.forEach(topic => {
    topic.completed = false;
  });

  return parsed;
}

/* ---------------- QUIZ GENERATION ---------------- */
export async function generateQuiz(analysisJson) {
  if (!analysisJson?.subject || !Array.isArray(analysisJson?.topics)) {
    throw new Error("Invalid document JSON");
  }

  const prompt = `
You are an EXAM QUIZ GENERATOR.

INPUT:
- Subject: ${analysisJson.subject}
- Topics (with difficulty & priority): ${JSON.stringify(analysisJson.topics, null, 2)}

TASK:
Generate AT LEAST 15 MCQ questions for exam practice (15 is the hard minimum, go up to 20 when topics allow).

RULES:
- Each question must be derived from the given topics
- 4 options per question, all unique, only one correct
- answerIndex is the 0-based index of the correct option
- Mix difficulties (easy, moderate, hard) across the whole set
- Spread questions across ALL provided topics
- Avoid vague or theory-only questions
- No explanations, no markdown, no prose

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "subject": "${analysisJson.subject}",
  "quiz": [
    {
      "question": "",
      "options": ["", "", "", ""],
      "answerIndex": 0,
      "topic": "",
      "difficulty": "easy|moderate|hard"
    }
  ]
}
`;

  return generateStructured({
    prompt: sanitizePrompt(prompt),
    schema: QuizSchema
  });
}

export default analyzeExamText;
