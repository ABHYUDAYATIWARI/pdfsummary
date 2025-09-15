import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import PDF from "../models/pdfModel.js";
import { User } from "../models/userModel.js";
// NEW: Import axios and cheerio
import axios from 'axios';
import * as cheerio from 'cheerio';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===================================================================
// NEW & IMPROVED TOOL FUNCTION
// ===================================================================

/**
 * Fetches the content of a URL, parses the HTML, and extracts clean text.
 * @param {string} url The URL of the webpage to read.
 * @returns {Promise<string>} The extracted text content of the webpage.
 */
async function getWebpageContent(url) {
    try {
        console.log(`Fetching content for: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);

        // Remove elements that don't typically contain main content
        $('script, style, nav, footer, header, aside, form').remove();

        // Get text from the body, clean up whitespace, and trim
        let textContent = $('body').text().replace(/\s\s+/g, ' ').trim();

        // Limit the content length to avoid overwhelming the model
        const maxLength = 6000;
        if (textContent.length > maxLength) {
            textContent = textContent.substring(0, maxLength) + "... (content truncated)";
        }

        console.log(`Successfully fetched and parsed content, length: ${textContent.length} characters`);
        return textContent;

    } catch (error) {
        console.error("Webpage fetch error:", error.message);
        return `Failed to fetch content from the URL. Please ensure it's a valid, accessible link. Error: ${error.message}`;
    }
}


// ===================================================================
// FIXED TOOL DEFINITION FOR GEMINI
// ===================================================================
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

// ===================================================================
// UPDATED TOOL EXECUTION HANDLER
// ===================================================================
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

// ===================================================================
// CONTROLLER FUNCTIONS
// ===================================================================
export const uploadPDF = async (req, res) => {
    // This function remains the same
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

export const chatWithPDF = async (req, res) => {
    const { message } = req.body;

    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf || pdf.user.toString() !== req.user.id) {
            return res.status(404).json({ message: "PDF not found" });
        }

        // ===================================================================
        // FIXED MODEL INITIALIZATION WITH TOOLS
        // ===================================================================
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            tools: [{ functionDeclarations: toolDeclarations }], // Fixed: Use the correct variable name
            toolConfig: {
                functionCallingConfig: {
                    mode: "AUTO" // This ensures tools are called when appropriate
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
                        "NEVER use any other JSON structure like {\"companies\": [...]} or {\"summary\": \"...\"} or any other format.\n" +
                        "ALL responses must use the \"answer\" key only.\n\n" +
                        "**EXAMPLES OF CORRECT FORMAT:**\n" +
                        "- Question about companies: { \"answer\": \"The companies mentioned in this PDF are: Company A, Company B, and Company C.\" }\n" +
                        "- Question about summary: { \"answer\": \"This PDF discusses various topics including...\" }\n" +
                        "- Question about URL: { \"answer\": \"Based on the webpage content, this site contains...\" }\n\n" +
                        "**IMPORTANT RULES:**\n" +
                        "1. **ALWAYS use the get_webpage_content tool when the user provides ANY URL** (including GitHub links, articles, documentation, etc.)\n" +
                        "2. **DO NOT refuse to access URLs** - you have the capability through your tool\n" +
                        "3. After fetching webpage content, provide a helpful response based on what you found\n" +
                        "4. For non-URL questions, use the PDF summary and chat history provided below\n" +
                        "5. **MANDATORY**: Every single response must use { \"answer\": \"...\" } format - no exceptions!\n\n" +
                        `**PDF Summary:**\n${pdf.summary || "No summary available"}\n\n` +
                        "**Available Tools:**\n- get_webpage_content: Can fetch and read content from any webpage URL\n\n" +
                        "Remember: No matter what the user asks, always put your complete response inside the \"answer\" field."
                }
            ]
        };


        const chat = model.startChat({
            history: [systemContext, ...history],
        });

        pdf.chatHistory.push({ role: "user", parts: [{ text: message }] });
        
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = message.match(urlRegex);

        console.log("URLs detected in message:", foundUrls);

        let modelResponseText;

        if (foundUrls && foundUrls.length > 0) {
            // Force tool usage for URLs
            console.log("URL detected, forcing tool usage");
            try {
                const toolResult = await executeTool({
                    name: "get_webpage_content",
                    args: { url: foundUrls[0] }
                });

                console.log("Tool result:", toolResult);

                // Now send both the original message and the tool result to the model
                const enhancedMessage = `${message}\n\nContent from ${foundUrls[0]}:\n${toolResult}`;
                const result = await chat.sendMessage(enhancedMessage);
                modelResponseText = result.response.text();
            } catch (error) {
                console.error("Error in forced tool execution:", error);
                const result = await chat.sendMessage(message);
                modelResponseText = result.response.text();
            }
        } else {
            // No URLs detected, proceed normally
            console.log("No URLs detected, proceeding with normal chat");
            const result = await chat.sendMessage(message);
            const response = result.response;

            // Check for function calls in the normal flow
            const candidates = response.candidates || [];
            const firstCandidate = candidates[0];
            const content = firstCandidate?.content;
            const parts = content?.parts || [];

            let functionCall = null;
            for (const part of parts) {
                if (part.functionCall) {
                    functionCall = part.functionCall;
                    break;
                }
            }

            console.log("Function call detected:", functionCall ? functionCall.name : "None");

            if (functionCall) {
                console.log("Executing function call:", functionCall);
                const toolResult = await executeTool(functionCall);
                console.log("Tool result length:", toolResult.length);

                const finalResult = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: functionCall.name,
                            response: {
                                name: functionCall.name,
                                content: toolResult,
                            },
                        },
                    },
                ]);
                modelResponseText = finalResult.response.text();
            } else {
                modelResponseText = response.text();
            }
        }

        console.log("Final model response:", modelResponseText);

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanJsonString(modelResponseText));
        } catch (e) {
            console.warn("Failed to parse JSON response, using raw text");
            parsedResponse = { answer: modelResponseText };
        }

        pdf.chatHistory.push({
            role: "model",
            parts: [{ text: JSON.stringify(parsedResponse) }],
        });

        await pdf.save();
        res.status(200).json(parsedResponse);

    } catch (error) {
        console.error("Error in chatWithPDF:", error);
        res.status(500).json({ message: "Error chatting with PDF", error: error.message });
    }
};