const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "yoursecretkey";
const JWT_EXPIRES_IN = "1d"; // 1 day

// Register student (Signup)
const registerStu = async (req, res) => {
    try {
        const { stuID, email, password, name, rollno, year, div, branch, dob, bloodGroup, fees, caste } = req.body;

        // Check if email already exists
        const existingUser = await Student.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new student
        const student = new Student({
            stuID,
            email,
            password: hashedPassword,
            name,
            rollno,
            year,
            div,
            branch,
            dob,
            bloodGroup,
            fees,
            caste
        });

        await student.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: student._id, email: student.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Store token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(201).json({ message: "Signup successful", student });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Login student
const loginStu = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find student by email
        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: student._id, email: student.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Store token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ message: "Login successful" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get student by stuID
const getStuId = async (req, res) => {
    try {
        const student = await Student.findOne({ stuID: req.params.id });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Logout student
const logoutStu = (req, res) => {
    try {
        res.clearCookie("token");
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registerStu, loginStu, getStuId, logoutStu };
