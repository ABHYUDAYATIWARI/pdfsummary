import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  LogOut,
} from "../controllers/userController.js";
import { VerifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/me", VerifyToken, getCurrentUser);
router.get("/logout-user", VerifyToken, LogOut);

export default router;