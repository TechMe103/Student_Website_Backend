const jwt = require('jsonwebtoken');
require('dotenv').config();
const Admin = require("../models/Admin");
const Student = require("../models/Student");

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

const authenticateToken = async (req, res, next) => {
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

        // Check user exists in DB
        if (req.user.role === "admin") {

            const adminExists = await Admin.findById(req.user.id);
            if (!adminExists) {
                return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
            }

        } else if (req.user.role === "student") {

            const studentExists = await Student.findById(req.user.id);
            if (!studentExists) {
                return res.status(404).json({ success: false, message: "Student not found" });
            }
        }

        next();
    } catch (err) {
        console.error("Token Verification Error:", err);
        return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
};

module.exports = authenticateToken;
