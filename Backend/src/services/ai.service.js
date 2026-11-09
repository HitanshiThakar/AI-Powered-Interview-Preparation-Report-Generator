import { GoogleGenAI } from "@google/genai";
// import { z } from "zod";
// import{ zodToJsonSchema } from "zod-to-json-schema";
import * as z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import puppeteer from "puppeteer"


const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
});
/*
async function invokeGeminiAi() {
    console.log("Sending request to Gemini...");

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: "Explain what an interview is in two sentences."
        });

        console.log("Gemini response:", response.text);
        return response.text;
    } catch (error) {
        console.error(
            "Gemini API error:",
            error.status ?? "",
            error.message
        );
        throw error;
    }
}
*/

const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100).describe("The match score between the candidate's resume and the job description, ranging from 0 to 100."),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question that can be asked in the interview."),
        intention: z.string().describe("The intention behind the question, what it is trying to assess."),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc."),
    })).describe("A list of technical questions that can be asked in the interview, along with their intention and how to answer them."),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question that can be asked in the interview."),
        intention: z.string().describe("The intention behind the question, what it is trying to assess."),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc."),
    })).describe("A list of behavioral questions that can be asked in the interview, along with their intention and how to answer them."),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill that the candidate is lacking or needs to improve."),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of the skill gap, how important it is to address it."),
    })).describe("A list of skill gaps that the candidate has, along with their severity."),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number of the preparation plan, starting from 1."),
        focus: z.string().describe("The focus area for that day, what to study or practice."),
        tasks: z.array(z.string()).describe("A list of tasks to complete for that day, what to do to prepare."),
    })).describe("A day-wise preparation plan for the candidate to follow, with focus areas and tasks for each day."),
    title: z.string().describe("The title of the job for which the interview report is generated"),
}).describe("The interview report containing technical questions, behavioral questions, skill gaps and a preparation plan.");


async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate an interview report for a candidate based on the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(interviewReportSchema),
            //   responseSchema: zodToJsonSchema(interviewReportSchema),

        }
    })

     if (!response.text) {
        throw new Error("Gemini returned an empty response.");
    }

    const interviewReport = JSON.parse(response.text);

    // Validate the generated report against the expected structure.
    return interviewReportSchema.parse(interviewReport);
}


async function generatePdfFromHtml(htmlContent) {
    if (typeof htmlContent !== "string" || !htmlContent.trim()) {
        throw new Error("Resume HTML is empty.");
    }

    let browser;
    let page;

    try {
        browser = await puppeteer.launch({ timeout: 15000 });
        page = await browser.newPage();
        page.setDefaultNavigationTimeout(15000);
        page.setDefaultTimeout(15000);
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            request.abort().catch((error) => {
                console.error("Unable to block a PDF rendering request:", error.message);
            });
        });

        const safeHtml = await page.evaluate((untrustedHtml) => {
            const allowedTags = new Set([
                "a", "article", "aside", "b", "blockquote", "br", "caption", "code", "dd", "div", "dl", "dt",
                "em", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
                "i", "li", "main", "ol", "p", "section", "small", "span", "strong", "sub", "sup", "table",
                "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"
            ]);
            const blockedTags = new Set([
                "audio", "base", "button", "embed", "form", "frame", "frameset", "iframe", "input", "link",
                "object", "script", "select", "source", "textarea", "video"
            ]);
            const parsed = new DOMParser().parseFromString(untrustedHtml, "text/html");
            const safeDocument = document.implementation.createHTMLDocument("");
            const policy = document.createElement("meta");
            policy.httpEquiv = "Content-Security-Policy";
            policy.content = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:";
            safeDocument.head.append(policy);

            for (const style of parsed.head.querySelectorAll("style")) {
                const safeStyle = safeDocument.createElement("style");
                safeStyle.textContent = style.textContent;
                safeDocument.head.append(safeStyle);
            }

            const copySafeNode = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return safeDocument.createTextNode(node.textContent);
                }
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return null;
                }

                const tagName = node.tagName.toLowerCase();
                if (blockedTags.has(tagName)) {
                    return null;
                }

                if (tagName === "style") {
                    const safeStyle = safeDocument.createElement("style");
                    safeStyle.textContent = node.textContent;
                    return safeStyle;
                }

                const safeElement = allowedTags.has(tagName)
                    ? safeDocument.createElement(tagName)
                    : safeDocument.createDocumentFragment();

                if (allowedTags.has(tagName)) {
                    for (const attribute of node.attributes) {
                        if (["class", "colspan", "id", "rowspan", "scope", "style", "title"].includes(attribute.name)) {
                            safeElement.setAttribute(attribute.name, attribute.value);
                        }
                    }
                }

                for (const child of node.childNodes) {
                    const safeChild = copySafeNode(child);
                    if (safeChild) {
                        safeElement.append(safeChild);
                    }
                }
                return safeElement;
            };

            for (const child of parsed.body.childNodes) {
                const safeChild = copySafeNode(child);
                if (safeChild) {
                    safeDocument.body.append(safeChild);
                }
            }

            return `<!doctype html>${safeDocument.documentElement.outerHTML}`;
        }, htmlContent);

        await page.setJavaScriptEnabled(false);
        await page.setContent(safeHtml, { waitUntil: "load", timeout: 15000 });

        const pdfData = await page.pdf({
            format: "A4",
            timeout: 15000,
            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        });
        const pdfBuffer = Buffer.from(pdfData);

        if (!pdfBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
            throw new Error("PDF rendering returned an invalid document.");
        }

        return pdfBuffer;
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (error) {
                console.error("PDF rendering page cleanup failed:", error.message);
            }
        }
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                console.error("PDF rendering browser cleanup failed:", error.message);
            }
        }
    }
}

//idea: ai will generate html and puppeteer will convert that html into pdf
async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumepdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

                      const response = await ai.models.generateContent({
                        model: "gemini-3.8-flash",
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: zodToJsonSchema(resumepdfSchema),
                        }
                       })

                       if (!response.text) {
                        throw new Error("Gemini returned an empty resume response.");
                       }

                       const jsonContent = JSON.parse(response.text)
                       if (typeof jsonContent.html !== "string" || !jsonContent.html.trim()) {
                        throw new Error("Gemini returned invalid resume HTML.");
                       }

                       const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

                        return pdfBuffer


}

export {
    generateInterviewReport,
    generateResumePdf,
    generatePdfFromHtml
}
