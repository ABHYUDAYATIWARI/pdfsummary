import fs from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import PdfChunk from "../models/pdfChunkModel.js";
import PDF from "../models/pdfModel.js";

export const triggerRagProcessing = async (pdfDoc) => {
    console.log(`Processing PDF with ID: ${pdfDoc._id}`);
    try {
        if (!pdfDoc || pdfDoc.isChunked) {
            console.log(`Skipping RAG processing for ${pdfDoc.filename} (already processed or invalid).`);
            return;
        }

        console.log(`Starting background RAG processing for: ${pdfDoc.filename}`);

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';

        const dataBuffer = fs.readFileSync(pdfDoc.path);
        const uint8array = new Uint8Array(dataBuffer);
        const doc = await pdfjsLib.getDocument(uint8array).promise;

        let fullText = '';
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        if (!fullText) {
            console.error(`Failed to extract text from PDF: ${pdfDoc.filename}`);
            return;
        }

        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 100 });
        const chunks = await splitter.splitText(fullText);

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            modelName: "text-embedding-004",
        });
        const chunkEmbeddings = await embeddings.embedDocuments(chunks);
        const chunkDocs = chunks.map((chunkText, i) => ({
            pdfId: pdfDoc._id,
            text: chunkText,
            embedding: chunkEmbeddings[i],
        }));
        await PdfChunk.insertMany(chunkDocs);

        const freshPdfDoc = await PDF.findById(pdfDoc._id);
        if (freshPdfDoc) {
            freshPdfDoc.isChunked = true;
            await freshPdfDoc.save();
        }

        console.log(`Successfully finished background RAG processing for: ${pdfDoc.filename}. Chunks created: ${chunks.length}`);

    } catch (error) {
        console.error(`Background RAG processing failed for PDF ${pdfDoc._id}:`, error);
    }
}