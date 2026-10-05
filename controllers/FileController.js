
import extractAndAppendText from "../utils/TextExtract.js";
import { analyzeExamText, generateQuiz } from "../utils/Gemini.js";
import Document from "../Models/GroqDataSchema.js";


/* ---------------- CONTROLLER ---------------- */

const ClassifyFiles = async (req, res) => {
    try {
        if (!req.files || req.files.papers.length === 0) {
            throw new Error("No files uploaded");
        }

        const results = [];

        for (const file of req.files) {
            const result = await classifyAndStore(file);

            results.push({
                filename: file.originalname,
                mimetype: file.mimetype,
                classification: result.type
            });
        }

        res.json({
            success: true,
            count: results.length,
            results
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};




const FetchQuestions = async (req, res) => {
  try {
    if (!req.files?.papers || req.files.papers.length === 0) {
      return res.status(400).json({ error: "NO_PAPERS_UPLOADED" });
    }

    const userId = req.userdata.id;              
    const { documentName } = req.body;           

    if (!documentName) {
      return res.status(400).json({ error: "DOCUMENT_NAME_REQUIRED" });
    }

    const syllabusFile = req.files?.syllabus?.[0] || null;

    let textChunks = [];
    let syllabusChunks = [];

    // Extract papers
    for (const file of req.files.papers) {
      await extractAndAppendText(file, textChunks);
    }

    const finalText = textChunks.join("\n");
    if (!finalText) {
      return res.status(400).json({ error: "NO_EXTRACTED_TEXT" });
    }

    // Extract syllabus (optional)
    let syllabusText = "";
    if (syllabusFile) {
      await extractAndAppendText(syllabusFile, syllabusChunks);
      syllabusText = syllabusChunks.join("\n");
    }
    // Analyze with Groq
    console.log(finalText);
    
    const groqdata = await analyzeExamText(finalText,syllabusText);

    // Save document
    await Document.create({
      documentName: documentName.trim(),
      userId,
      jsonFile: groqdata
    });

    return res.status(201).json(groqdata);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const GetDocuments= async(req,res)=>{
 try {
    const userId=req.userdata.id
  const documents = await Document.find({userId}).sort({createdAt:-1});
  return res.status(200).json({documents})
 } catch (error) {
  res.status(500).json({error:error.message})
 }

}



const GetQuiz = async (req, res) => {
  try {
    console.log("inside quiz");
    
    const userId = req.userdata.id;          // ✅ from JWT
    const { documentId } = req.query;       // ✅ from route

    if (!documentId) {
      return res.status(400).json({ error: "DOCUMENT_ID_REQUIRED" });
    }

    // 1️⃣ Fetch document (ownership enforced)
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: "DOCUMENT_NOT_FOUND" });
    }

    const analysisJson = document.jsonFile;

    if (!analysisJson?.subject || !Array.isArray(analysisJson?.topics)) {
      return res.status(400).json({ error: "INVALID_DOCUMENT_JSON" });
    }

    // 2️⃣ Generate quiz with Gemini (>= 15 MCQs) + Zod validation
    const quizJson = await generateQuiz(analysisJson);

    return res.status(200).json(quizJson);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const saveDocument = async (req, res) => {
  try {
    const userId = req.userdata.id;     // ✅ from JWT
    const documentData = req.body;      // ✅ full document sent

    if (!documentData?._id) {
      return res.status(400).json({ error: "DOCUMENT_ID_REQUIRED" });
    }

    if (!documentData?.jsonFile || typeof documentData.jsonFile !== "object") {
      return res.status(400).json({ error: "INVALID_JSON_FILE" });
    }

    // 🔒 Fetch existing document & enforce ownership
    const document = await Document.findOne({
      _id: documentData._id,
      userId
    });

    if (!document) {
      return res.status(404).json({ error: "DOCUMENT_NOT_FOUND" });
    }

    // 🔁 Replace JSON completely
    document.jsonFile = documentData.jsonFile;

    // 🔥 Required for Mixed type
    document.markModified("jsonFile");
    const newdoc = await document.save();

    return res.status(200).json({
      message: "DOCUMENT_UPDATED",
      document:newdoc
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};




export  {ClassifyFiles,FetchQuestions,GetDocuments,GetQuiz,saveDocument};

