import axios from "axios";
import "dotenv/config";

const GROQ_API_KEY = process.env.GROQ_API_KEY;



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

/* ---------------- MAIN ANALYSIS ---------------- */
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
1. Strictly provide 15 main_topic entries.
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
- Output ONLY valid JSON
- No explanations, markdown, or comments

OUTPUT FORMAT
{
  "subject": "<string>",
  "topics": [
    {
      "main_topic": "",
      "priority": "",
      "difficulty": "",
      "side_topics": [],
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
  

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const output = response.data.choices[0].message.content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(output);
    parsed.topics.map(
      (topic)=>{
    topic.completed=false
      }
    );
  } catch {
    throw new Error("LLM returned invalid JSON");
  }



  return parsed;
}

export default analyzeExamText;
