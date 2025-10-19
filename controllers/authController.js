const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Student = require("../models/Student.js")
const Admin = require('../models/Admin.js');
const { signupSchema, loginSchema } = require('../validators/authValidation.js');

const {uploadToCloudinary}=require("../helpers/UploadToCloudinary.js");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

const cookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24, // 1 day
  sameSite: 'lax',
};

// ---------------- SIGNUP ----------------
exports.signup = async (req, res) => {
    try {
        const { firstName, middleName, lastName, studentID, PRN, email, password, branch, year } = req.body;

        // Validate input using Joi
        const { error } = signupSchema.validate(req.body, { abortEarly: false });
        if (error) {
        const validationErrors = error.details.map(err => ({
            field: err.path[0],
            message: err.message
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: validationErrors
        });
        }

        // Check if Student exists
        const existingStuID = await Student.findOne({ studentID: studentID });
        if (existingStuID) return res.status(400).json({ success: false, message: 'Student ID already exists' });

        const existingEmail = await Student.findOne({ email });
        if (existingEmail) return res.status(400).json({ success: false, message: 'Email already exists' });

        const existingPRN = await Student.findOne({ PRN });
        if (existingPRN) return res.status(400).json({ success: false, message: 'PRN already exists' });

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Student photo is required" });
        }

        let studentPhoto = null;
        if (req.file) {
            const uploaded = await uploadToCloudinary(req.file.path);
            studentPhoto = {
                url: uploaded.url,
                publicId: uploaded.publicId
            };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Student
        const student = await Student.create({
            name: { firstName, middleName, lastName },
            studentID: studentID,
            PRN,
            email,
            password: hashedPassword,
            branch,
            year,
            studentPhoto
        });

        // Create JWT
        const token = jwt.sign(
        { id: student._id, role: 'student' },
        JWT_SECRET,
        { expiresIn: '1d' }
        );

        // Send JWT only in cookie
        res.cookie('token', token, cookieOptions);

        return res.status(201).json({ success: true, message: 'Signup successful' });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
};

// ---------------- LOGIN ----------------
exports.login = async (req, res) => {
    try {
        const { studentID, password } = req.body;

        if (!studentID || !password) {
        return res.status(400).json({ error: "Student ID and password are required" });
        }

        // Validate input
        const { error } = loginSchema.validate(req.body, { abortEarly: false });
        if (error) {
        const validationErrors = error.details.map(err => ({
            field: err.path[0],
            message: err.message
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: validationErrors
        });
        }

        // Find student by studentID
        const student = await Student.findOne({ studentID: studentID });
        if (!student) return res.status(400).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, student.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
        { id: student._id, role: 'student' },
        JWT_SECRET,
        { expiresIn: '1d' }
        );

        res.cookie('token', token, cookieOptions);
        return res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
};

// ---------------- ADMIN LOGIN ----------------
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, admin.password);
        if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign(
        { id: admin._id, email: admin.email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1d' }
        );

        res.cookie('token', token, cookieOptions);
        return res.status(200).json({ message: 'Admin login successful' });
    } catch (error) {
        console.error("Admin Login Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
};

// ---------------- LOGOUT ----------------
exports.logout = (req, res) => {
    try {
        res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
        return res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        console.error("Logout Error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
};
 