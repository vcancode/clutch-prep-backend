
import extractAndAppendText from "../utils/TextExtract.js";
import analyzeExamText from "../utils/Groq.js";

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




const FetchQuestions= async(req,res)=>{
   try {
     const syllabusfile=req.files?.syllabus?.[0]||0;

   let textChunks = [];
   let SyllabusChunks=[];

  for (let file of req.files.papers) {
    await extractAndAppendText(file, textChunks);
  }
  let SyllabusText="";
  if(syllabusfile){
    await extractAndAppendText(syllabusfile,SyllabusChunks);
    SyllabusText=SyllabusChunks.join("\n"); 
  }
  const finalText = textChunks.join("\n");
  

  const groqdata=await analyzeExamText(finalText,SyllabusText);

  res.send(groqdata);
   } catch (error) {
     res.send(error.message);
   }

}

export  {ClassifyFiles,FetchQuestions};

