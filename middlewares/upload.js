import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB per file
  },
});

export const uploadExamFiles = upload.fields([
  { name: "syllabus", maxCount: 1 }, 
  { name: "papers", maxCount: 10 }   
]);
