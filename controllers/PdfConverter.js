import cloudinary from '../utils/Cloudinary.js';
import { createWorker } from 'tesseract.js';
import axios from 'axios';

const ImageConvert = async (files) => {
    let worker;
    try {
        // 1. Ensure 'files' is an array even if a single file is passed
        const fileList = Array.isArray(files) ? files : [files];
        
        if (!fileList || fileList.length === 0) {
            throw new Error("No files provided for conversion");
        }

        // 2. Initialize Tesseract
        worker = await createWorker('eng');
        const finalResults = [];

        // FIXED: Changed 'req.files' to 'fileList'
        for (const file of fileList) {
            // 3. Upload PDF as an IMAGE resource
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { 
                        resource_type: "image", 
                        format: "pdf",
                        public_id: `doc_${Date.now()}` 
                    },
                    (err, result) => err ? reject(err) : resolve(result)
                );
                stream.end(file.buffer);
            });

            const pageCount = uploadResult.pages || 1;
            let combinedText = "";

            // 4. Process Pages
            for (let i = 1; i <= pageCount; i++) {
                const pageImageUrl = cloudinary.url(uploadResult.public_id, {
                    resource_type: "image",
                    page: i,
                    density: 300,
                    width: 1200,
                    crop: "scale",
                    format: "png" 
                });

                try {
                    const response = await axios.get(pageImageUrl, { 
                        responseType: 'arraybuffer',
                        timeout: 15000 // Increased timeout slightly for large renders
                    });
                    
                    const { data: { text } } = await worker.recognize(Buffer.from(response.data));
                    combinedText += `\n--- Page ${i} ---\n${text}`;
                } catch (imgErr) {
                    console.error(`Failed to fetch page ${i}:`, imgErr.message);
                    combinedText += `\n--- Page ${i} ---\n[Error rendering page]`;
                }
            }

            finalResults.push({
                filename: file.originalname || "scanned_doc.pdf",
                text: combinedText
            });

            // 5. Cleanup Cloudinary storage
            await cloudinary.uploader.destroy(uploadResult.public_id);
        }

        // FIXED: Return the data instead of using res.json()
        return finalResults;

    } catch (err) {
        console.error("ImageConvert Error:", err.message);
        throw err; // Rethrow so the parent function knows something went wrong
    } finally {
        if (worker) await worker.terminate();
    }
};

export default ImageConvert;