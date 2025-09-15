import mongoose from "mongoose";

const pdfChunkSchema = new mongoose.Schema({
  pdfId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "PDF",
    required: true,
    index: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  embedding: {
    type: [Number],
    required: true
  }
});

export default mongoose.model("PdfChunk", pdfChunkSchema);