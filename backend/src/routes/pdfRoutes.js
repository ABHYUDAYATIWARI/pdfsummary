import { Router } from "express";
import { uploadPDF, getPDFs, getPDFById, chatWithPDF } from "../controllers/pdfController.js";
import { VerifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.route("/").post(VerifyToken, upload.single("pdf"), uploadPDF).get(VerifyToken, getPDFs);
router.route("/:id").get(VerifyToken, getPDFById);
router.route("/:id/chat").post(VerifyToken, chatWithPDF);


export default router;