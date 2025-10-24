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

const { importExcelSchema, addStudentDetailsSchema, updateStudentSchema, getStudentsValidation} = require("../validators/studentValidation");

const cascadeDeleteStudent = require("../helpers/cascadeDeleteStudent");

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

				// Validate current student object
				const { error, value } = importExcelSchema.validate(data, { abortEarly: false });
				if (error) {
					const validationErrors = error.details.map(err => ({
						field: err.path[0],
						message: err.message
					}));
					
					failedStudents.push({
						studentID: data.studentID,
						email: data.email,
						error: validationErrors
					});
					continue; // Skip this student, continue with next
				}

				const newStudent = new Student({
					studentID: data.studentID.trim(),
					email: data.email.trim(),
					password: hashedPassword,
				});

				const savedStudent = await newStudent.save();

				// Only send email if saved successfully
				const mailOptions = {
				from: process.env.emailUser,
				to: data.email,
				subject: "Your Account Password",
				text: `Hello ${data.studentID},\n\nYour new password is: ${randomPassword}\n`,
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
	
	let dbSaved=false;	//flag to track if save to Db oprations succeeds or fails

	let uploadResult=null;

	try {
		const studentId = req.user.id;


		const student = await Student.findById(studentId);
		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}
		

		// Destructure fields from request body
		const {firstName, middleName, lastName, motherName, PRN, branch, year, dob, bloodGroup, currentStreet, currentCity, pincode, nativeStreet, nativeCity, nativePincode, category, mobileNo, parentMobileNo } = req.body;


		// Basic required field check
		if (!firstName || !middleName || !lastName || !motherName || !PRN || !branch || !year || !dob || !bloodGroup || !currentStreet || !currentCity || !pincode || !nativeStreet || !nativeCity || !nativePincode || !category || !mobileNo || !parentMobileNo) {
			return res.status(400).json({ success: false, message: "All fields are required" });
		}


		if(!req.file){
			return res.status(400).json({ success: false, message: "Student Photo required" });
		}

		

		// Validate input using Joi
		const { error, value } = addStudentDetailsSchema.validate({firstName, middleName, lastName, motherName, PRN, branch, year, dob, bloodGroup, currentStreet, currentCity, pincode, nativeStreet, nativeCity, nativePincode, category, mobileNo, parentMobileNo }, { abortEarly: false });
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

		// Convert dob string to Date before saving
		const dobDate = new Date(dob);

		

		let studentPhoto = null;
        if (req.file) {
            uploadResult = await uploadToCloudinary(req.file.path);
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
			lastName,
			motherName
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
			studentId, { name, PRN, branch, year, dob : dobDate, bloodGroup, currentAddress, nativeAddress, category, mobileNo, parentMobileNo, studentPhoto},{ new: true } // Return the updated document
		);
		dbSaved=true;

		res.status(201).json({ success: true, data: studentWithAddedDetails, message: "Added details successfully!" });
	} catch (err) {
		console.error("Error in createPersonalDetail:", err);

		// if Db update failed, then delete photo uploaded to cloudinary
		if(!dbSaved){
			await cloudinary.uploader.destroy(uploadResult.publicId);
		}
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// ==================== UPDATE STUDENT ====================
const updateStudent = async (req, res) => {
	let dbSaved=false;
	let uploadResult=null;
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


		const {firstName, middleName, lastName, motherName, PRN, branch, year, dob, bloodGroup, currentStreet, currentCity, pincode, nativeStreet, nativeCity, nativePincode, category, mobileNo, parentMobileNo } = req.body;


		// Validate input using Joi
		const { error, value } = updateStudentSchema.validate({firstName, middleName, lastName, motherName, PRN, branch, year, dob, bloodGroup, currentStreet, currentCity, pincode, nativeStreet, nativeCity, nativePincode, category, mobileNo, parentMobileNo }, { abortEarly: false });
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

		// Convert dob string to Date before saving
		const dobDate = new Date(value.dob);
		
		const updatedData = {};

		// Name
		if (req.body.firstName) updatedData["name.firstName"] = req.body.firstName;
		if (req.body.middleName) updatedData["name.middleName"] = req.body.middleName;
		if (req.body.lastName) updatedData["name.lastName"] = req.body.lastName;
		if (req.body.motherName) updatedData["name.motherName"] = req.body.motherName;

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
		if (req.body.dob) updatedData.dob = dobDate;
		if (req.body.bloodGroup) updatedData.bloodGroup = req.body.bloodGroup;
		if (req.body.category) updatedData.category = req.body.category;
		if (req.body.mobileNo) updatedData.mobileNo = req.body.mobileNo;
		if (req.body.parentMobileNo) updatedData.parentMobileNo = req.body.parentMobileNo;

		// Handle student photo upload
		const photoFile = req.file;
		
		if (photoFile) {

			// Upload new photo
			uploadResult = await uploadToCloudinary(photoFile.path);

			if(!uploadResult){
				return res.status(500).json({success:false, message:"Failed to upload details. please try again later"});
			}


			// Set uploaded photo in updatedData
			updatedData.studentPhoto = { url: uploadResult.url, publicId: uploadResult.publicId };
		}

		// Update DB
		const updatedStudent = await Student.findByIdAndUpdate(
			studentId,
			{ $set: updatedData },
			{ new: true, runValidators: true, select: "-password" }
		);
		dbSaved=true;


		//if DB update succeeds then delete old photo from cloudinary
		try {
			await cloudinary.uploader.destroy(oldPublicId);
		} catch (err) {
			console.error("Old photo deletion failed:", err.message);
		}

		res.status(200).json({ success: true, message: "Student updated successfully", data: updatedStudent });
	} catch (err) {
		console.error("Error in updateStudent:", err);
		if(!dbSaved && uploadResult.publicId){
			await cloudinary.uploader.destroy(uploadResult.publicId);
		}
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

			console.log("Cloudinary delete result:", delResult);

			
			if(delResult.result !== "ok" && delResult.result !== "not found"){
				return res.status(500).json({ success: false, message: "Cannot delete student. Please try again later." });
			}
		}


		const result=await Student.findByIdAndDelete(studentId);

		if(!result){
			return res.status(500).json({success:false, message:"Cannot delete student. Please try again later."})
		}

		// delete other documents in other schemas referencing to this student --only if studdent is first successfully deleted from Student.js
		if(result){
			await cascadeDeleteStudent(studentId);
		}

		res.status(200).json({ success: true, message: "Student deleted successfully" });
	} catch (err) {
		console.error("Error in deleteStudent:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};


// GET STUDENTS (with optional pagination)
const getStudents = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify admin
   	const adminExists = await Admin.exists({ _id: adminId});
	if (!adminExists) {
		return res.status(403).json({ success: false, message: "Unauthorized" });

	}

    // Get query params
    const { year, search, page, limit } = req.query;

	// Validate input using Joi
	const { error, value } = getStudentsValidation.validate({ year, search, page, limit }, { abortEarly: false });
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

    // Use defaults
	const pageNum = value.page || 1;
	const limitNum = value.limit || 10;

    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (year) {
		filter.year = year.trim();
	}
    if (search) {
		// sanitize to prevent regex injection
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		filter.$or = [
			{ 'name.firstName': { $regex: safeSearch, $options: 'i' } },
			{ 'name.middleName': { $regex: safeSearch, $options: 'i' } },
			{ 'name.lastName': { $regex: safeSearch, $options: 'i' } },
			{ 'name.motherName': { $regex: safeSearch, $options: 'i' } },
		];
    }


    // Get total count for filtered results
    const total = await Student.countDocuments(filter);

    // Fetch students with pagination
    const students = await Student.find(filter)
      .skip(skip)
      .limit(limitNum)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: students,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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


module.exports = {addStudentDetails, getStudentById ,getStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords };
