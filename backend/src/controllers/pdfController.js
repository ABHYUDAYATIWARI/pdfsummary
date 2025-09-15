import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import PDF from "../models/pdfModel.js";
import { User } from "../models/userModel.js";
import { getWebpageContent } from "../config/webConfig.js";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const toolDeclarations = [
    {
        name: "get_webpage_content",
        description: "Fetch the main text content from any webpage URL including GitHub repositories. Use this whenever a user provides a URL or asks about web content.",
        parameters: {
            type: "OBJECT",
            properties: {
                url: {
                    type: "STRING",
                    description: "The full URL of the webpage to read (e.g., https://example.com/article or https://github.com/user/repo)"
                }
            },
            required: ["url"]
        }
    }
];

async function executeTool(functionCall) {
    console.log(`Executing tool: ${functionCall.name} with args:`, functionCall.args);

    try {
        switch (functionCall.name) {
            case "get_webpage_content": // Handle the new tool
                const { url } = functionCall.args;
                return await getWebpageContent(url);

            default:
                console.error(`Unknown tool: ${functionCall.name}`);
                return `Unknown tool: ${functionCall.name}`;
        }
    } catch (error) {
        console.error(`Error executing tool ${functionCall.name}:`, error);
        return `Error executing tool: ${error.message}`;
    }
}

// ===================================================================
// UTILITY FUNCTIONS (Unchanged)
// ===================================================================
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

export const uploadPDF = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            "You are an assistant that summarizes PDFs. Respond ONLY in JSON format: { \"summary\": \"short summary here\" }",
            fileToGenerativePart(req.file.path, "application/pdf"),
        ]);

        const response = await result.response;
        let summary = "";
        try {
            const jsonOutput = JSON.parse(cleanJsonString(response.text()));
            summary = jsonOutput.summary || "";
        } catch (e) {
            summary = response.text();
        }

        const pdf = await PDF.create({
            user: req.user.id,
            filename: req.file.originalname,
            path: req.file.path,
            summary,
        });

        user.pdfs.push(pdf._id);
        await user.save();
        const fileSizeInMB = req.file.size / (1024 * 1024);
        const RAG_THRESHOLD_MB = 15;

        if (fileSizeInMB > RAG_THRESHOLD_MB) {
            console.log(`PDF size (${fileSizeInMB.toFixed(2)} MB) exceeds threshold. Triggering RAG processing.`);
            triggerRagProcessing(pdf);
        } else {
            console.log(`PDF size (${fileSizeInMB.toFixed(2)} MB) is under threshold. Skipping RAG processing.`);
        }

        res.status(200).json(pdf);

    } catch (error) {
        console.error("Error in uploadPDF:", error);
        res.status(500).json({ message: "Error summarizing PDF" });
    }
};

export const getPDFs = async (req, res) => {
    const pdfs = await PDF.find({ user: req.user.id });
    res.status(200).json(pdfs);
};

export const getPDFById = async (req, res) => {
    const pdf = await PDF.findById(req.params.id);

    if (pdf && pdf.user.toString() === req.user.id) {
        res.status(200).json(pdf);
    } else {
        res.status(404).json({ message: "PDF not found" });
    }
};

export const deletePDF = async (req, res) => {
    try {
        const { id: pdfId } = req.params;

        const pdf = await PDF.findById(pdfId);

        if (!pdf || pdf.user.toString() !== req.user.id) {
            return res.status(404).json({ message: "PDF not found or unauthorized" });
        }

        if (fs.existsSync(pdf.path)) {
            fs.unlinkSync(pdf.path);
            console.log(`Deleted physical file: ${pdf.path}`);
        }
        await PDF.findByIdAndDelete(pdfId);
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { pdfs: pdfId },
        });

        res.status(200).json({ success: true, message: "PDF and all associated data deleted successfully." });

    } catch (error) {
        console.error("Error in deletePDF:", error);
        res.status(500).json({ message: "Server error while deleting PDF." });
    }
};

export const chatWithPDF = async (req, res) => {
    const { message } = req.body;
    try {
        const pdf = await PDF.findById(req.params.id);
        if (!pdf || pdf.user.toString() !== req.user.id) {
            return res.status(404).json({ message: "PDF not found" });
        }

        let modelResponseText;

        if (pdf.isChunked) {
            console.log("PDF is chunked (large PDF), using RAG pipeline.");

            const embeddings = new GoogleGenerativeAIEmbeddings({
                apiKey: process.env.GEMINI_API_KEY,
                modelName: "text-embedding-004",
            });
            const queryVector = await embeddings.embedQuery(message);

            const relevantChunks = await PdfChunk.aggregate([
                {
                    $vectorSearch: {
                        index: "idx_embedding_search",
                        path: "embedding",
                        queryVector: queryVector,
                        numCandidates: 100,
                        limit: 5,
                        filter: { pdfId: pdf._id }
                    },
                },
                { $project: { _id: 0, text: 1 } }
            ]);

            console.log(`Found ${relevantChunks.length} relevant chunks.`);
            const context = relevantChunks.map(chunk => chunk.text).join("\n\n---\n\n");

            const augmentedPrompt = `You are a helpful AI assistant. Answer the user's question based ONLY on the following context provided from a PDF document. If the answer is not in the context, say "I could not find information about that in the document."

            Context:
            ${context}

            User's Question: ${message}

            Your Answer (in JSON format: {"answer": "..."}):`;

            const ragModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await ragModel.generateContent(augmentedPrompt);
            modelResponseText = result.response.text();

        } else {
            console.log("PDF not chunked (small PDF), using optimized pipeline.");

            const needsWebTool = message.toLowerCase().includes('http') ||
                message.toLowerCase().includes('www.') ||
                message.toLowerCase().includes('url') ||
                message.toLowerCase().includes('website') ||
                message.toLowerCase().includes('link');

            if (needsWebTool) {
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    tools: [{ functionDeclarations: toolDeclarations }],
                    toolConfig: {
                        functionCallingConfig: {
                            mode: "AUTO"
                        }
                    }
                });

                const history = pdf.chatHistory.map(entry => ({
                    role: entry.role,
                    parts: entry.parts.map(p => ({ text: p.text }))
                }));

                const systemContext = {
                    role: "user",
                    parts: [
                        {
                            text:
                                "You are a helpful assistant that can read web pages and answer questions about PDFs. " +
                                "You have access to a tool called 'get_webpage_content' that can fetch content from any URL.\n\n" +
                                "**CRITICAL FORMATTING RULE:**\n" +
                                "You MUST ALWAYS respond in this EXACT JSON format: { \"answer\": \"your complete response here\" }\n" +
                                "NEVER use any other JSON structure.\n\n" +
                                "**IMPORTANT RULES:**\n" +
                                "1. **ALWAYS use the get_webpage_content tool when the user provides ANY URL**\n" +
                                "2. After fetching webpage content, provide a helpful response based on what you found\n" +
                                "3. For non-URL questions, use the PDF summary provided below\n" +
                                "4. **MANDATORY**: Every response must use { \"answer\": \"...\" } format\n\n" +
                                `**PDF Summary:**\n${pdf.summary || "No summary available"}\n\n`
                        }
                    ]
                };

                const chat = model.startChat({ history: [systemContext, ...history] });
                const result = await chat.sendMessage(message);
                const response = result.response;
                const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

                if (functionCall) {
                    console.log("Executing function call:", functionCall.name);
                    const toolResult = await executeTool(functionCall);
                    const finalResult = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: functionCall.name,
                                response: { name: functionCall.name, content: toolResult },
                            },
                        },
                    ]);
                    modelResponseText = finalResult.response.text();
                } else {
                    modelResponseText = response.text();
                }
            } else {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const trimmedHistory = pdf.chatHistory.slice(-10).map(entry => ({
                    role: entry.role,
                    parts: entry.parts.map(p => ({ text: p.text }))
                }));

                const systemPrompt = `You are a helpful AI assistant. Answer questions about the PDF based on the summary and chat history provided below.

**CRITICAL**: Always respond in this exact JSON format: {"answer": "your response here"}

PDF Summary:
${pdf.summary || "No summary available"}

Previous conversation context:
${trimmedHistory.map(h => `${h.role}: ${h.parts[0]?.text || ''}`).join('\n')}

User Question: ${message}

Response (JSON format):`;

                const result = await model.generateContent(systemPrompt);
                modelResponseText = result.response.text();
            }
        }

        console.log("Model response received");

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanJsonString(modelResponseText));
        } catch (e) {
            console.warn("Failed to parse JSON response, using raw text");
            parsedResponse = { answer: modelResponseText };
        }

        pdf.chatHistory.push({ role: "user", parts: [{ text: message }] });
        pdf.chatHistory.push({
            role: "model",
            parts: [{ text: JSON.stringify(parsedResponse) }],
        });

        if (pdf.chatHistory.length > 50) {
            pdf.chatHistory = pdf.chatHistory.slice(-30);
        }

        await pdf.save();
        res.status(200).json(parsedResponse);

    } catch (error) {
        console.error("Error in chatWithPDF:", error);
        res.status(500).json({ message: "Error chatting with PDF", error: error.message });
    }
};