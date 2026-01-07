import express from "express"
import multer from "multer";
import FileRouter from "./routes/FileRoutes.js";
import cors from "cors"
import 'dotenv/config';


const app=express();
//?necessary middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true,limit:"50mb"}));


//?router uses

app.use("/files",FileRouter);



app.get("/",(req,res)=>{
    console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    res.send("hello");
})

// Global Error Handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({
            success: false,
            error: err.message,
            code: err.code,
            field: err.field,
            debug: {
                message: "MulterError caught in global handler"
            }
        });
    } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(500).json({
            success: false,
            error: err.message,
            debug: {
                message: "General error caught in global handler"
            }
        });
    }
    next();
});

app.listen(5000)
