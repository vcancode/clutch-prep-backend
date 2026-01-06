import express from 'express'
import  { uploadExamFiles } from '../middlewares/upload.js';
import {FetchQuestions} from '../controllers/FileController.js';
import YoutubeFetcher from '../controllers/YoutubeFetch.js';
import { searchPlaylists } from '../controllers/PlaylistFetch.js';


const FileRouter = express.Router();

FileRouter.post("/getgroq",uploadExamFiles,FetchQuestions);
FileRouter.post("/youtube",YoutubeFetcher);
FileRouter.post("/playlist",searchPlaylists);


export default FileRouter