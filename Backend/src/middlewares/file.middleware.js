import multer from "multer";
import path from "node:path";

export const MAX_RESUME_SIZE = 3 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_RESUME_SIZE,
        files: 1
    },
    fileFilter(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();
        const supportedMimeType = ["application/pdf", "application/octet-stream"].includes(file.mimetype);

        if (extension !== ".pdf" || !supportedMimeType) {
            const error = new Error("Please upload a PDF file.");
            error.statusCode = 415;
            callback(error);
            return;
        }

        callback(null, true);
    }
});

function uploadResume(req, res, next) {
    upload.single("resume")(req, res, (error) => {
        if (!error) {
            next();
            return;
        }

        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({
                message: "Resume must be 3 MB or smaller."
            });
            return;
        }

        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            message: error.statusCode === 415
                ? error.message
                : "Resume upload could not be processed."
        });
    });
}

export default uploadResume;