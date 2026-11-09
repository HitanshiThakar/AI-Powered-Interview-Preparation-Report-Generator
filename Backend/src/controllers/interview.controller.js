import { PDFParse } from "pdf-parse";
import { generateInterviewReport, generateResumePdf} from "../services/ai.service.js";
import interviewReportModel from "../models/interviewReport.model.js";
import mongoose from "mongoose";

/**
 * @description Controller to generate interview report based on user self description, resume and job description
 */
async function generateInterviewReportController(req, res) {

    const resumeFile = req.file; // Access the uploaded resume file
    const { selfDescription, jobDescription } = req.body;

    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
        return res.status(400).json({
            message: "Job description is required."
        });
    }

    if (!resumeFile && (typeof selfDescription !== "string" || !selfDescription.trim())) {
        return res.status(400).json({
            message: "Upload a PDF resume or provide a self-description."
        });
    }

    let resumeContent = "";

    if (resumeFile) {
        if (!Buffer.isBuffer(resumeFile.buffer) || resumeFile.buffer.length === 0) {
            return res.status(400).json({
                message: "The uploaded resume is empty."
            });
        }

        const pdfHeader = Buffer.from("%PDF-");
        if (!resumeFile.buffer.subarray(0, 1024).includes(pdfHeader)) {
            return res.status(415).json({
                message: "The uploaded file is not a valid PDF."
            });
        }

        let parser;
        try {
            parser = new PDFParse({ data: resumeFile.buffer });
            const result = await parser.getText({ pageJoiner: "" });
            resumeContent = result.text;
        } catch (error) {
            console.error("Resume PDF parsing failed:", error.message);
            return res.status(422).json({
                message: "The uploaded PDF could not be read. Check that it is not damaged or password-protected."
            });
        } finally {
            if (parser) {
                try {
                    await parser.destroy();
                } catch (error) {
                    console.error("Resume PDF parser cleanup failed:", error.message);
                }
            }
        }

        if (typeof resumeContent !== "string" || !resumeContent.trim()) {
            return res.status(422).json({
                message: "The PDF contains no selectable text. Upload a text-based PDF or provide a self-description."
            });
        }
    }

    const interviewReportByAi = await generateInterviewReport({
        resume: resumeContent,
        selfDescription,
        jobDescription
    });
    const interviewReport = await interviewReportModel.create({
        ...interviewReportByAi,
        user: req.user.id,
        resume: resumeContent,
        selfDescription,
        jobDescription
    });
    res.status(201).json({
        message: "Interview report generated successfully",
        interviewReport
    });


}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req,res) {

    const { interviewId } = req.params

    if (!mongoose.isObjectIdOrHexString(interviewId)) {
        return res.status(404).json({
            message: "Interview report not found"
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user:req.user.id })

    if(!interviewReport){
        return res.status(404).json({
            message: "Interview report not found"
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully",
        interviewReport
    })
    
}

/**
 * @description Controller to get all interview reports of logged in user
 */
async function getAllInterviewReportController(req,res) {

   const interviewReports = await interviewReportModel
  .find({ user: req.user.id })
  .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
  .sort({ createdAt: -1 });
    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
    
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    if (!mongoose.isObjectIdOrHexString(interviewReportId)) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewReportId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport
    if (
        typeof jobDescription !== "string" ||
        !jobDescription.trim() ||
        ![resume, selfDescription].some((value) => typeof value === "string" && value.trim())
    ) {
        return res.status(422).json({
            message: "This interview report does not contain enough information to generate a resume."
        })
    }

    let pdfBuffer;
    try {
        pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })
    } catch (error) {
        console.error("Resume PDF generation failed:", error.message);
        return res.status(500).json({
            message: "Unable to generate the resume PDF. Please try again."
        })
    }

    if (!Buffer.isBuffer(pdfBuffer) || !pdfBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
        console.error("Resume PDF generation returned an invalid document.")
        return res.status(500).json({
            message: "Unable to generate the resume PDF. Please try again."
        })
    }

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
        "X-Content-Type-Options": "nosniff"
    })

    res.send(pdfBuffer)
}

export default {
    generateInterviewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportController,
    generateResumePdfController
}
