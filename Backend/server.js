//To access all the variables created inside .env file  on whole express server

// Load environment variables from .env
import "dotenv/config";

import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
// import invokeGeminiAi from "./src/services/ai.service.js";
// import { resume, selfDescription, jobDescription } from "./src/services/temp.js";
// import { generateInterviewReport } from "./src/services/ai.service.js";



// Start the server

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectToDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();


// Temporary test: call Gemini manually when needed.
// Avoid calling it on every server startup in your final application.
// invokeGeminiAi().catch((error) => {
//     console.error("Gemini API error:", error);
// });


// generateInterviewReport({resume, selfDescription, jobDescription})
/*
generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
})
    .then((report) => {
        console.log("Interview report received.");
        console.log(JSON.stringify(report, null, 2));
    })
    .catch((error) => {
        console.error("Failed to generate report:", error.message);
    });
    */