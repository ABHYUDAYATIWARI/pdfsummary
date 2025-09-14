import jwt from "jsonwebtoken";
import {User} from "../models/userModel.js";

export const VerifyToken = async (req, res, next) => {
  try {
    // Check for token in Authorization header first, then in cookies
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to the request object
    req.user = await User.findById(decoded.id).select("-password");
    
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};