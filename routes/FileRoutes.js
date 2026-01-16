import express from 'express'
import  { uploadExamFiles } from '../middlewares/upload.js';
import {FetchQuestions} from '../controllers/FileController.js';
import { enrichGroqJson } from '../controllers/YoutubeFetcher.js';
import { jwtauthmiddleware } from '../middlewares/JwtMiddleware.js';
import { GetDocuments } from '../controllers/FileController.js';
import { GetQuiz } from '../controllers/FileController.js';
import { saveDocument } from '../controllers/FileController.js';





const FileRouter = express.Router();

FileRouter.post("/getgroq",jwtauthmiddleware,uploadExamFiles,FetchQuestions);
FileRouter.post("/getyoutube",jwtauthmiddleware,enrichGroqJson);
FileRouter.post("/getquiz",jwtauthmiddleware,GetQuiz);
FileRouter.post("/getdocuments",jwtauthmiddleware,GetDocuments);
FileRouter.post("/savedocument",jwtauthmiddleware,saveDocument);


export default FileRouter