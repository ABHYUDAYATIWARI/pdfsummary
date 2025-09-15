import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "model"],
    required: true,
  },
  parts: [
    {
      text: {
        type: String,
        required: true,
      },
    },
  ],
});

const pdfSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    filename: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
    },
    isChunked: {
      type: Boolean,
      default: false,
    },
    chatHistory: [chatMessageSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("PDF", pdfSchema);
