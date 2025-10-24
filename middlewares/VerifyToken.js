// middlewares/verifyToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

const verifyToken = (req, res, next) => {
    try {
        // Get token from cookies
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "Access denied. No token provided." });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request
        req.user = decoded; // contains { id, email(admin) , role }

        next();
    } catch (err) {
        console.error("Token Verification Error:", err);
        return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
};

module.exports = verifyToken;
