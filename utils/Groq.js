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
You are an EXAM-ORIENTED SYLLABUS ANALYSIS ASSISTANT.

Input:
• University EXAM PAPER TEXT (always)
• SYLLABUS TEXT (optional)

Goal:
Extract REPEATED, MARKS-ORIENTED EXAM QUESTION PATTERNS.
Do NOT extract chapters or abstract topics.

CORE RULE
Each main_topic MUST be a QUESTION-SOLVING UNIT that can be:
solved / derived / constructed / traced / implemented in an exam.

Abstract paradigms may appear ONLY as side_topics.

EXTRACTION RULES
1. main_topic must map to a realistic 5–15 mark exam question.
2. sort the json file in a priority order from begenning topics to the complex topics
3. For each main_topic, extract ≤3 MINIMAL prerequisites from basics that a student must know to even work on that topic(≤10 min learnable).
4. If SYLLABUS is provided → extract ONLY syllabus-aligned questions.
5. If no syllabus → infer from repetition and phrasing in exam paper.
6. Merge equivalent question patterns into ONE topic.
7. Ignore instructions, marks, section labels, and rare one-off theory questions.
8. Minimum Of 15 topics must be provided

SEARCH QUERIES (IMPORTANT)
For each main_topic generate:
• topic_query → narrow query to learn ONLY how to solve that question.
• playlist_query → broader parent topic the question belongs to.

Examples:
topic_query: "LCS DP table construction"
playlist_query: "dynamic programming algorithms"

Do NOT include platform names.

FOR EACH MAIN_TOPIC PROVIDE
• priority: high | medium | low
• difficulty: easy | moderate | hard
• definition: ~40 words explaining HOW the question is solved (exam strategy)
• side_topics: max 3 minimal prerequisites
• topic_query
• playlist_query
• question_types: 3–4 realistic exam-style question patterns

STRICT OUTPUT RULES
• main_topic must be question-solving, not abstract.
• ≤3 side_topics only.
• No invented syllabus chapters.
• Output ONLY valid JSON.
• No explanations, no markdown, no comments.

OUTPUT FORMAT (STRICT JSON)
{
  "subject": "<subject name or null>",
  "subject_query": "<full subject search query>",
  "topics": [
    {
      "main_topic": "",
      "priority": "",
      "difficulty": "",
      "side_topics": [],
      "definition": "",
      "topic_query": "",
      "playlist_query": "",
      "question_types": [],
    }
  ]
}

SYLLABUS TEXT:
${syllabusText}

EXAM QUESTIONS:
${cleanedExamText}
`;

  const finalPrompt = sanitizePrompt(rawPrompt);
  console.log(finalPrompt);
  

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2
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
  } catch {
    throw new Error("LLM returned invalid JSON");
  }

  return parsed;
}

export default analyzeExamText;
