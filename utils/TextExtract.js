import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import ImageConvert from "../controllers/PdfConverter.js"; // Your Cloudinary-based utility

/* ---------- OCR WORKER ---------- */
let worker;

// Initialize a persistent worker for standard image files
async function initOCR() {
  worker = await createWorker('eng');
}
await initOCR();

async function ocrImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1000) {
    throw new Error("Invalid image buffer for OCR");
  }
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

/* ---------- MAIN ---------- */

async function extractAndAppendText(file, accumulator) {
  if (!file || !file.buffer || !file.mimetype) {
    throw new Error("Invalid file");
  }

  const { buffer, mimetype } = file;

  // 1. IMAGE HANDLING (Single standard images)
  if (mimetype.startsWith("image/")) {
    const text = await ocrImage(buffer);
    accumulator.push(text);
    return;
  }

  // 2. PDF HANDLING
  if (mimetype === "application/pdf") {
    // Check for selectable text first
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    console.log(textResult.length);
    
    
    const meaningful =
      textResult.text &&
      textResult.text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "") 
  .replace(/\s+/g, " ")
  .trim().length > 50;

    await parser.destroy();

    if (meaningful) {
      // PDF contains selectable text (Digital PDF)
      accumulator.push(textResult.text);
      return;
    }

    // 3. SCANNED PDF HANDLING (No selectable text found)
    // We call your ImageConvert utility which handles Cloudinary upload + Page OCR
    try {
      const ocrResults = await ImageConvert(file);
      
      if (ocrResults && ocrResults.length > 0) {
        // We take the combined text from all pages
        accumulator.push(ocrResults[0].text);
      }
    } catch (error) {
      console.error("Scanned PDF OCR failed:", error.message);
      throw new Error(`Failed to process scanned PDF: ${error.message}`);
    }
    return;
  }

  // 4. DOCX HANDLING
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    accumulator.push(result.value);
    return;
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}

export default extractAndAppendText;