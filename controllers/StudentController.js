const Student = require("../models/Student");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");

const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

require("dotenv").config();

// Configure your email transporter (example with Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.emailUser,       // your email
    pass: process.env.emailPassword,          // app password if 2FA enabled
  },
});

// Function to generate strong random password
const generateRandomPassword = (length = 14) => {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
};

const importExcelDataWithPasswords = async (req, res) => {
	try {
		const adminId = req.user.id;



		// Verify admin exists
		const adminExists = await Admin.findById(adminId);
		if (!adminExists) {
		return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}

		if (!req.file) {
		return res.status(400).json({ success: false, message: "No file uploaded" });
		}

		// 1️⃣ Read Excel file
		const workbook = xlsx.readFile(req.file.path);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];

		// 2️⃣ Convert Excel sheet to JSON
		const rawData = xlsx.utils.sheet_to_json(sheet);

		if (rawData.length === 0) {
		return res.status(400).json({ success: false, message: "Excel file is empty" });
		}

		// 3️⃣ Extract studentID & email
		const filteredData = rawData
		.map((row) => ({
			studentID: row.studentID || row.StudentID || row["Student ID"] || "",
			email: row.email || row.Email || row["Email ID"] || "",
		}))
		.filter((item) => item.studentID && item.email);

		if (filteredData.length === 0) {
		return res.status(400).json({
			success: false,
			message: "No valid studentID or email fields found in Excel file",
		});
		}

		// 4️⃣ For each student: generate, hash, save, and email
		let successCount = 0;
		let failedStudents = [];

		for (const data of filteredData) {
		try {
			const randomPassword = generateRandomPassword(14);
			const hashedPassword = await bcrypt.hash(randomPassword, 10);

			const newStudent = new Student({
			studentID: data.studentID,
			email: data.email,
			password: hashedPassword,
			});

			const savedStudent = await newStudent.save();

			// Only send email if saved successfully
			const mailOptions = {
			from: process.env.emailUser,
			to: data.email,
			subject: "Your Account Password",
			text: `Hello ${data.studentID},\n\nYour new password is: ${randomPassword}\n\nPlease change it after your first login.`,
			};

			await transporter.sendMail(mailOptions);
			successCount++;
		} catch (err) {
			console.error(`❌ Failed for ${data.studentID}:`, err.message);
			failedStudents.push({
			studentID: data.studentID,
			email: data.email,
			error: err.message,
			});
		}
		}

		// 5️⃣ Delete uploaded file
		fs.unlinkSync(req.file.path);

		res.status(200).json({
		success: true,
		message: `Process completed. ${successCount} students added and emailed successfully.`,
		failed: failedStudents,
		});
	} catch (error) {
		console.error("Error importing Excel:", error);
		res.status(500).json({
		success: false,
		message: "Error importing Excel data",
		});
	}
};


// Add remaining Details from schema
const addStudentDetails = async (req,res)=>{
	
};

// search filter and pagination
const getStudents = async (req, res) => {
	try {
		// 1️⃣ Get query params
		const { year, search, page = 1, limit = 10 } = req.query;

		// 2️⃣ Build filter object
		const filter = {};
		if (year) filter.year = year;
		if (search) filter['name.firstName'] = search; // simple exact match for firstName

		// 3️⃣ Pagination
		const skip = (page - 1) * limit;

		// 4️⃣ Fetch data
		const students = await Student.find(filter)
		.skip(skip)
		.limit(parseInt(limit))
		.select('-password'); // do not return password

		// 5️⃣ Send response
		res.json({ success: true, data: students });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};





// ==================== GET ALL STUDENTS (Admin only) ====================
const getAllStudents = async (req, res) => {
	try {
		const adminId = req.user.id;

		// Verify admin exists
		const adminExists = await Admin.findById(adminId);
		if (!adminExists) {
		return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}

		const students = await Student.find().sort({ createdAt: -1 });
		res.status(200).json({ success: true, data: students });
	} catch (error) {
		console.error("Error in getAllStudents:", error);
		res.status(500).json({ success: false, message: "Server Error" });
	}
};

// ==================== GET SINGLE STUDENT BY ID (Admin) ====================
const getSingleStudent = async (req, res) => {
	try {

		const { studentId } = req.params;
		if (!studentId) {
			return res.status(400).json({ success: false, message: "Student ID is required" });
		}

		const adminId = req.user.id;

		// Verify requester exists
		if (req.user.role === "admin") {
		const adminExists = await Admin.findById(adminId);
		if (!adminExists) {
			return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}
		} else{
			return res.status(400).json({ success: false, message: "Bad Request" });
		}

		const student = await Student.findById(studentId);
		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		return res.status(200).json({ success: true, data: student });
	} catch (error) {
		console.error("Error in getSingleStudent:", error);
		return res.status(500).json({ success: false, message: "Server Error" });
	}
};

// Get single Student from req.user.id ( for student )
const getStudentById= async (req,res)=>{

	try{
		const studentId=req.user.id;

		if(!studentId){
			return res.status(400).json({ success: false, message: "Student ID is required, Please Login first" });
		}

		const student = await Student.findById(studentId);
		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		return res.status(200).json({ success: true, data: student });
	}catch(error){
		console.error("Error in getStudentById : ", error);
		return res.status(500).json({success: false, message: "Server Error"});
	}

}; 

// ==================== UPDATE STUDENT ====================
const updateStudent = async (req, res) => {
	try {
		const { studentId } = req.params;
		const userId = req.user.id;

		// Verify requester
		if (req.user.role === "admin") {
		const adminExists = await Admin.findById(userId);
		if (!adminExists) {
			return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}
		} else if (req.user.role === "student") {
		if (userId !== studentId) {
			return res.status(403).json({ success: false, message: "Unauthorized access" });
		}
		}

		const student = await Student.findById(studentId);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		const { name, email, branch, year, password } = req.body;
		const updatedData = { name, email, branch, year };
		if (password) updatedData.password = password;

		// Handle student photo upload
		const photoFile = req.files?.studentPhoto?.[0];
		if (photoFile) {
		if (student.studentPhoto?.publicId) {
			await cloudinary.uploader.destroy(student.studentPhoto.publicId);
		}
		const result = await uploadToCloudinary(photoFile.path);
		updatedData.studentPhoto = { url: result.url, publicId: result.publicId };
		}

		const updatedStudent = await Student.findByIdAndUpdate(studentId, { $set: updatedData }, { new: true, runValidators: true });

		res.status(200).json({ success: true, message: "Student updated successfully", data: updatedStudent });
	} catch (err) {
		console.error("Error in updateStudent:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// ==================== DELETE STUDENT ====================
const deleteStudent = async (req, res) => {
	try {
		const { studentId } = req.params;
		const userId = req.user.id;

		// Verify requester
		if (req.user.role === "admin") {
		const adminExists = await Admin.findById(userId);
		if (!adminExists) {
			return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}
		} else if (req.user.role === "student") {
		if (userId !== studentId) {
			return res.status(403).json({ success: false, message: "Unauthorized access" });
		}
		}

		const student = await Student.findById(studentId);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		// Delete student photo from Cloudinary if exists
		if (student.studentPhoto?.publicId) {
		await cloudinary.uploader.destroy(student.studentPhoto.publicId);
		}

		await Student.findByIdAndDelete(studentId);

		res.status(200).json({ success: true, message: "Student deleted successfully" });
	} catch (err) {
		console.error("Error in deleteStudent:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

module.exports = {getStudents, getAllStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords };
