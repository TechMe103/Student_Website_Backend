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


// Add remaining Details from schema --for student
const addStudentDetails = async (req,res)=>{
	try {
		const studentId = req.user.id;

		const student = await Student.findById(studentId);
		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}
		

		// Destructure fields from request body
		const {firstName, middleName, lastName, PRN, branch, year, dob, bloodGroup, currentStreet, currentCity, pincode, nativeStreet, nativeCity, nativePincode, category, mobileNo, parentMobileNo } = req.body;

		// Basic required field check
		if (!firstName || !middleName || !lastName || !PRN || !branch || !year || !dob || !bloodGroup || !currentStreet || !currentCity || !pincode || !nativeStreet || !nativeCity || !nativePincode || !category || !mobileNo || !parentMobileNo) {
			return res.status(400).json({ success: false, message: "All fields are required" });
		}


		if(!req.file){
			return res.status(400).json({ success: false, message: "Student Photo required" });
		}

		let studentPhoto = null;
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.path);
			if(!uploadResult){
				return res.status(500).json({success:false, message: "Photo upload failed, Please try again later"});
			}
            studentPhoto = {
                url: uploadResult.url,
                publicId: uploadResult.publicId
            };
        }

		//Build nested object for name
		const name = {
			firstName,
			middleName,
			lastName
		}

		// Build nested objects for addresses
		const currentAddress = {
			street: currentStreet,
			city: currentCity,
			pincode: pincode
		};

		const nativeAddress = {
			street: nativeStreet,
			city: nativeCity,
			nativePincode: nativePincode
		};

		// Update the existing student
		const studentWithAddedDetails = await Student.findByIdAndUpdate(
			studentId, { name, PRN, branch, year, dob, bloodGroup, currentAddress, nativeAddress, category, mobileNo, parentMobileNo, studentPhoto},{ new: true } // Return the updated document
		);

		//Db update failed, then delete photo uploaded to cloudinary
		if(!studentWithAddedDetails){
			const delResult=await cloudinary.uploader.destroy(uploadResult.publicId);
			console.log(delResult);
			return res.status(500).json({ success: false, message: "Couldnt save the data, Please try again later." });
		}

		res.status(201).json({ success: true, data: studentWithAddedDetails, message: "Added details successfully!" });
	} catch (err) {
		console.error("Error in createPersonalDetail:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// search filter and pagination --created basic conntroller for now, will make this more secure and better later on.
const getStudents = async (req, res) => {
	try {
		const adminId = req.user.id;

		// Verify admin exists
		const adminExists = await Admin.findById(adminId);
		if (!adminExists) {
		return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}

		// Get query params
		const { year, search, page, limit=10 } = req.query;

		// Build filter object
		const filter = {};
		if (year) filter.year = year;
		if (search) filter['name.firstName'] = search; // simple exact match for firstName

		// Pagination
		const skip = (page - 1) * limit;

		// Fetch data
		const students = await Student.find(filter)
		.skip(skip)
		.limit(parseInt(limit))
		.select('-password'); // do not return password

		// Send response
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

		const student = await Student.findById(studentId);

		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		// Verify requester
		if (req.user.role === "admin") {
			const adminExists = await Admin.findById(userId);
			if (!adminExists) {
				return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
			}
		} else if (req.user.role === "student") {

			if(student._id.toString() !== userId.toString()){
				return res.status(403).json({ success: false, message: "Resource does not belong to logged in student" });
			}
	
		}else{
			return res.status(400).json({success:false, message: "Bad Request"});
		}

		//for dealing with updated studentPhoto later
		if (!student.studentPhoto || !student.studentPhoto.publicId) {
			return res.status(400).json({
				success: false,
				message: "Please fill the details first. You cannot update without uploading a profile photo initially."
			});
		}

		const oldPublicId = student.studentPhoto.publicId;


		const {firstName, middleName, lastName, PRN, branch, year, dob, bloodGroup, currentStreet, currentCity, pincode, nativeStreet, nativeCity, nativePincode, category, mobileNo, parentMobileNo } = req.body;
		
		const updatedData = {};

		// Name
		if (req.body.firstName) updatedData["name.firstName"] = req.body.firstName;
		if (req.body.middleName) updatedData["name.middleName"] = req.body.middleName;
		if (req.body.lastName) updatedData["name.lastName"] = req.body.lastName;

		// Current Address
		if (req.body.currentStreet) updatedData["currentAddress.street"] = req.body.currentStreet;
		if (req.body.currentCity) updatedData["currentAddress.city"] = req.body.currentCity;
		if (req.body.pincode) updatedData["currentAddress.pincode"] = req.body.pincode;

		// Native Address
		if (req.body.nativeStreet) updatedData["nativeAddress.street"] = req.body.nativeStreet;
		if (req.body.nativeCity) updatedData["nativeAddress.city"] = req.body.nativeCity;
		if (req.body.nativePincode) updatedData["nativeAddress.nativePincode"] = req.body.nativePincode;

		// Other top-level fields
		if (req.body.PRN) updatedData.PRN = req.body.PRN;
		if (req.body.branch) updatedData.branch = req.body.branch;
		if (req.body.year) updatedData.year = req.body.year;
		if (req.body.dob) updatedData.dob = req.body.dob;
		if (req.body.bloodGroup) updatedData.bloodGroup = req.body.bloodGroup;
		if (req.body.category) updatedData.category = req.body.category;
		if (req.body.mobileNo) updatedData.mobileNo = req.body.mobileNo;
		if (req.body.parentMobileNo) updatedData.parentMobileNo = req.body.parentMobileNo;

		// Handle student photo upload
		const photoFile = req.file;
		let uploadResult=null;
		if (photoFile) {

			// Upload new photo
			uploadResult = await uploadToCloudinary(photoFile.path);


			// Set uploaded photo in updatedData
			updatedData.studentPhoto = { url: uploadResult.url, publicId: uploadResult.publicId };
		}

		// Update DB
		const updatedStudent = await Student.findByIdAndUpdate(
			studentId,
			{ $set: updatedData },
			{ new: true, runValidators: true }
		);

		if (!updatedStudent && uploadResult !== null) {
			// Rollback: delete newly uploaded photo
			await cloudinary.uploader.destroy(uploadResult.publicId);
			return res.status(500).json({ success: false, message: "DB update failed, photo rollback done" });
		}

		//if DB update succeeds then delete old photo from cloudinary
		try {
			await cloudinary.uploader.destroy(oldPublicId);
		} catch (err) {
			console.error("Old photo deletion failed:", err.message);
		}

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

		const student = await Student.findById(studentId);

		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		// Verify requester
		if (req.user.role === "admin") {
			const adminExists = await Admin.findById(userId);
			if (!adminExists) {
				return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
			}
		} else if (req.user.role === "student") {

			if(student._id.toString() !== userId.toString()){
				return res.status(403).json({ success: false, message: "Resource does not belong to logged in student" });
			}
	
		}else{
			return res.status(400).json({success:false, message: "Bad Request"});
		}

		if(!student.studentPhoto.publicId){
			return res.status(400).json({success:false, message: "To delete a student all details are necessary to be filled."});
		}

		// Delete student photo from Cloudinary if exists
		if (student.studentPhoto.publicId) {
			const delResult=await cloudinary.uploader.destroy(student.studentPhoto.publicId);
			
			if(delResult.result !== "ok"){
				return res.status(500).json({ success: false, message: "Cannot delete student. Please try again later." });
			}
		}


		const result=await Student.findByIdAndDelete(studentId);

		if(!result){
			return res.status(500).json({success:false, message:"Cannot delete student. Please try again later."})
		}

		res.status(200).json({ success: true, message: "Student deleted successfully" });
	} catch (err) {
		console.error("Error in deleteStudent:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

module.exports = {addStudentDetails, getStudentById ,getStudents, getAllStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords };
