import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import 'dotenv/config';

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: "100kb" }));
// app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.static("public"));
app.use(cookieParser());


import userRoutes from "./src/routes/userRoutes.js";
import pdfRoutes from "./src/routes/pdfRoutes.js";


app.use("/api/users", userRoutes);
app.use("/api/pdf", pdfRoutes);

export default app;