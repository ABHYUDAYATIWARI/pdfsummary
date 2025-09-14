import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import PDF from "../models/pdfModel.js";
import { User } from "../models/userModel.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType,
        },
    };
}
function cleanJsonString(rawString) {
    let cleanedString = rawString.trim();

    if (cleanedString.startsWith("```json")) {
        cleanedString = cleanedString.substring(7);
    }

    if (cleanedString.endsWith("```")) {
        cleanedString = cleanedString.substring(0, cleanedString.length - 3);
    }

    return cleanedString.trim();
}

// ---------- Upload PDF & Summarize ----------
export const uploadPDF = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            "You are an assistant that summarizes PDFs. " +
            "Respond ONLY in JSON format: { \"summary\": \"short summary here\" }",
            fileToGenerativePart(req.file.path, "application/pdf"),
        ]);

        const response = await result.response;

        let summary = "";
        try {
            const jsonOutput = JSON.parse(cleanJsonString(response.text()));
            summary = jsonOutput.summary || "";
        } catch (e) {
            summary = response.text(); // fallback if JSON parse fails
        }

        const pdf = await PDF.create({
            user: req.user.id,
            filename: req.file.originalname,
            path: req.file.path,
            summary,
        });

        user.pdfs.push(pdf._id);
        await user.save();

        res.status(200).json(pdf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error summarizing PDF" });
    }
};

// ---------- Get All PDFs ----------
export const getPDFs = async (req, res) => {
    const pdfs = await PDF.find({ user: req.user.id });
    res.status(200).json(pdfs);
};

// ---------- Get PDF by ID ----------
export const getPDFById = async (req, res) => {
    const pdf = await PDF.findById(req.params.id);

    if (pdf && pdf.user.toString() === req.user.id) {
        res.status(200).json(pdf);
    } else {
        res.status(404).json({ message: "PDF not found" });
    }
};
// ---------- Chat with PDF ----------
export const chatWithPDF = async (req, res) => {
    const { message } = req.body;
    const pdf = await PDF.findById(req.params.id);

    if (!pdf || pdf.user.toString() !== req.user.id) {
        return res.status(404).json({ message: "PDF not found" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // ✅ Clean history for Gemini (remove _id, timestamps, etc.)
        const history = pdf.chatHistory.map(entry => ({
            role: entry.role,
            parts: entry.parts.map(p => ({ text: p.text }))
        }));

        // ✅ Always include summary as system context
        const systemContext = {
            role: "user",
            parts: [
                {
                    text:
                        "Context: This chat is about a PDF.\n\n" +
                        `PDF Summary: ${pdf.summary || "No summary available"}\n\n` +
                        "Use this summary + chat history to answer queries."
                }
            ]
        };

        const chat = model.startChat({
            history: [systemContext, ...history],
        });
        
        const result = await chat.sendMessage(
            "You are a chatbot that always responds strictly in JSON format. " +
            "No markdown, no arrays, no nested objects. " +
            "Only return one string field called 'answer'.\n" +
            "Example: { \"answer\": \"This is a single string answer.\" }\n\n" +
            `User question: ${message}`
        );


        const response = await result.response;

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanJsonString(response.text()));
        } catch (e) {
            parsedResponse = { answer: response.text() }; // fallback
        }

        // ✅ Save new messages in DB
        pdf.chatHistory.push({ role: "user", parts: [{ text: message }] });
        pdf.chatHistory.push({
            role: "model",
            parts: [{ text: JSON.stringify(parsedResponse) }],
        });

        await pdf.save();

        res.status(200).json(parsedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error chatting with PDF" });
    }
};
