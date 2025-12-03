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

const { validateAndUploadFiles } = require("../helpers/ValidateAndUploadFiles");

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


const fileConfigs =[
	{
		fieldName: "studentPhoto",
		allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
		maxSize: 5 * 1024 * 1024,
		friendlyName: "Student Photo"
	},
];

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

		// Read Excel file
		const workbook = xlsx.readFile(req.file.path);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];

		// Convert Excel sheet to JSON
		const rawData = xlsx.utils.sheet_to_json(sheet);

		if (rawData.length === 0) {
		return res.status(400).json({ success: false, message: "Excel file is empty" });
		}

		// Extract studentID & email
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

		// For each student: generate, hash, save, and email
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

		// Delete uploaded file
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



// Controller: Export all students to Excel
const exportAllStudentsToExcel = async (req, res) => {
  try {

	const adminId=req.user.id;

	if(req.user.role !== "admin"){
		return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
	}

	// Verify admin exists
	const adminExists = await Admin.findById(adminId);
	if (!adminExists) {
		return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
	}



    // 1. Fetch all students from DB
    const students = await Student.find();

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found in the database.",
      });
    }

    // 2. Format data for Excel
    const formattedData = students.map((student) => ({
      StudentID: student.studentID || "",
	  Name: student.name?.lastName + student.name?.firstName + student.name?.middleName || "",
      Email: student.email || "",
      Branch: student.branch + "",
      Year: student.year || "",
      DOB: student.dob || "",
      BloodGroup: student.bloodGroup || "",
      MobileNo: student.mobileNo || "",
      CurrentStreet: student.currentAddress?.street || "",
      CurrentCity: student.currentAddress?.city || "",
      CurrentPincode: student.currentAddress?.pincode || "",
	  StudentPhotoURL: student.studentPhoto?.url || "",

    }));

    // 3. Create a new workbook and sheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(formattedData);

    xlsx.utils.book_append_sheet(workbook, worksheet, "Students");

    // 4. Save file temporarily to server
    const exportDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const filePath = path.join(exportDir, `Students_${Date.now()}.xlsx`);
    xlsx.writeFile(workbook, filePath);

    // 5. Send file to user for download
    return res.download(filePath, "StudentsData.xlsx", (err) => {
      if (err) {
        console.error("Error while downloading file:", err);
        res.status(500).json({ success: false, message: "File download failed" });
      }

      // 6. Delete file after sending (to avoid clutter)
      fs.unlink(filePath, (delErr) => {
        if (delErr) console.error("Error deleting temp file:", delErr);
      });
    });
  } catch (error) {
    console.error("Error exporting students to Excel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while exporting data.",
    });
  }
};


// Add remaining Details from schema --for student or admin
const addStudentDetails = async (req, res) => {
    let uploadedFiles = null;
    let dbSaved = false;

    try {
        let studentId;

        if (req.user.role === "student") {

            studentId = req.user.id;

        } else if (req.user.role === "admin") {

            studentId = req.body.studentId;
			if (!studentId) {
                return res.status(400).json({ success: false, message: "Student ID is required for admin" });
            }

			if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return res.status(400).json({ success: false, message: "Invalid Student ID format" });
            }

            const studentExists = await Student.findById(studentId);
            if (!studentExists) {
                return res.status(404).json({ success: false, message: "Student not found" });
            }

		}else{
			return res.status(401).json({ success: false, message: "Unauthorized access" });
		}


        // Validate input using Joi
        const { error, value } = addStudentDetailsSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));

            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        // Check if file is uploaded
        if (!req.files || Object.keys(req.files).length === 0) {
			return res.status(400).json({ success: false, message: "Student Photo is required" });
		}

        // Upload & validate file using helper
        uploadedFiles = await validateAndUploadFiles(req.files, fileConfigs);

        const studentPhoto = {
            url: uploadedFiles.studentPhoto.url,
            publicId: uploadedFiles.studentPhoto.publicId
        };

        // Build nested objects
        const name = {
            firstName: value.firstName,
            middleName: value.middleName,
            lastName: value.lastName,
            motherName: value.motherName
        };

        const currentAddress = {
            street: value.currentStreet,
            city: value.currentCity,
            pincode: value.pincode
        };

        const nativeAddress = {
            street: value.nativeStreet,
            city: value.nativeCity,
            nativePincode: value.nativePincode
        };

        // Update student in DB
        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            {
                name,
                PRN: value.PRN,
                branch: value.branch,
                year: value.year,
                dob: value.dob,
                bloodGroup: value.bloodGroup,
                currentAddress,
                nativeAddress,
                category: value.category,
                mobileNo: value.mobileNo,
                parentMobileNo: value.parentMobileNo,
                parentEmail: value.parentEmail,
                abcId: value.abcId,
                studentPhoto
            },
            { new: true }
        );

        dbSaved = true;

        return res.status(201).json({ success: true, message: "Student details added successfully", data: updatedStudent });

    } catch (err) {
        console.error("Error in addStudentDetails:", err);

        // Rollback uploaded file if DB save fails
        if (!dbSaved && uploadedFiles) {
            const publicIds = Object.values(uploadedFiles).map(file => file.publicId);
            await deleteMultipleFromCloudinary(publicIds);
        }

        return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
    }
};

// UPDATE STUDENT -- student or admin
const updateStudent = async (req, res) => {
    let dbSaved = false;
    let uploadedFiles = null;
    let studentId;

    try {
        // Determine studentId based on role
        if (req.user.role === "admin") {
            studentId = req.params.studentId; // fixed typo from studentIdl
        } else if (req.user.role === "student") {
            studentId = req.user.id;
        }

        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, message: "Student ID required in valid format." });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Verify requester-resource relation
        if (req.user.role === "student" && student._id.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: "Resource does not belong to logged-in student" });
        }

        // Ensure student already has a photo
        if (!student.studentPhoto || !student.studentPhoto.publicId) {
            return res.status(400).json({
                success: false,
                message: "Please fill the details first. You cannot update without uploading a profile photo initially."
            });
        }

        const oldPublicId = student.studentPhoto.publicId;

        // Validate input
        const { error, value } = updateStudentSchema.validate(req.body, { abortEarly: false, stripUnknown: true, convert: true });
        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        // Prepare updated data
        const updatedData = {};

        // Name fields
        if (value.firstName) updatedData["name.firstName"] = value.firstName;
        if (value.middleName) updatedData["name.middleName"] = value.middleName;
        if (value.lastName) updatedData["name.lastName"] = value.lastName;
        if (value.motherName) updatedData["name.motherName"] = value.motherName;

        // Current Address
        if (value.currentStreet) updatedData["currentAddress.street"] = value.currentStreet;
        if (value.currentCity) updatedData["currentAddress.city"] = value.currentCity;
        if (value.pincode) updatedData["currentAddress.pincode"] = value.pincode;

        // Native Address
        if (value.nativeStreet) updatedData["nativeAddress.street"] = value.nativeStreet;
        if (value.nativeCity) updatedData["nativeAddress.city"] = value.nativeCity;
        if (value.nativePincode) updatedData["nativeAddress.nativePincode"] = value.nativePincode;

        // Other fields
        if (value.PRN) updatedData.PRN = value.PRN;
        if (value.branch) updatedData.branch = value.branch;
        if (value.year) updatedData.year = value.year;
        if (value.dob) updatedData.dob = new Date(value.dob);
        if (value.bloodGroup) updatedData.bloodGroup = value.bloodGroup;
        if (value.category) updatedData.category = value.category;
        if (value.mobileNo) updatedData.mobileNo = value.mobileNo;
        if (value.parentMobileNo) updatedData.parentMobileNo = value.parentMobileNo;
		if (value.abcId) updatedData.abcId=value.abcId;
		if (value.parentEmail) updatedData.parentEmail=value.parentEmail;

        // Handle student photo upload using validateAndUploadFiles
        if (req.files && Object.keys(req.files).length > 0) {
            uploadedFiles = await validateAndUploadFiles(req.files, fileConfigs);

            if (!uploadedFiles.studentPhoto) {
                return res.status(500).json({ success: false, message: "Failed to upload photo. Please try again." });
            }

            updatedData.studentPhoto = {
                url: uploadedFiles.studentPhoto.url,
                publicId: uploadedFiles.studentPhoto.publicId
            };
        }

        // Update student in DB
        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            { $set: updatedData },
            { new: true, runValidators: true, select: "-password" }
        );

        dbSaved = true;

        // Delete old photo if a new one was uploaded
        if (uploadedFiles && uploadedFiles.studentPhoto && oldPublicId) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (err) {
                console.error("Old photo deletion failed:", err.message);
            }
        }

        return res.status(200).json({ success: true, message: "Student updated successfully", data: updatedStudent });

    } catch (err) {
        console.error("Error in updateStudent:", err);

        // Rollback uploaded file if DB save fails
        if (!dbSaved && uploadedFiles) {
            const publicIds = Object.values(uploadedFiles).map(file => file.publicId);
            await deleteMultipleFromCloudinary(publicIds);
        }

        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



// DELETE STUDENT --student or admin
const deleteStudent = async (req, res) => {
	try {
		let studentId;


		// Verify requester
		if (req.user.role === "admin") {

			studentId=req.params.studentId;

			if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
				return res.status(400).json({ success:false, message: "Student ID required in valid format." });
			}

			
		} else if (req.user.role === "student") {

			studentId = req.user.id;
	
		}else{
			return res.status(403).json({success:false, message: "Unauthorized role"});
		}

		const student = await Student.findByIdAndDelete(studentId);

		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		// Delete student photo only if details deleted from cloudinary
		if (student.studentPhoto && student.studentPhoto.publicId) {
			try {
				await deleteFromCloudinary(student.studentPhoto.publicId);
			} catch (err) {
				console.error("Cloudinary cleanup failed:", err);
			}
		}


		// delete other documents in other schemas referencing to this student --only if studdent is first successfully deleted from Student.js
		   try {
				await cascadeDeleteStudent(studentId);
			} catch (err) {
				console.error("Cascade failed:", err);
			}
		

		return res.status(200).json({ success: true, message: "Student deleted successfully" });
	} catch (err) {
		console.error("Error in deleteStudent:", err);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};


// GET STUDENTS (with optional pagination) --admin only
const getStudents = async (req, res) => {
  try {

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
	const limitNum = Math.min(value.limit || 10, 50);
	const skip = (pageNum - 1) * limitNum;

	const filter = {};

	if (value.year) {
		filter.year = value.year;
	}

	if (value.search) {
		//regex safety
		const safeSearch = value.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

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
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// GET SINGLE STUDENT BY ID (Admin)
const getSingleStudent = async (req, res) => {
	try {

		const { studentId } = req.params;

		//check studentId
		if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
			return res.status(400).json({ success:false, message: "Student ID required in valid format." });
		}

		// Verify role
		if (req.user.role !== "admin") {
			return res.status(403).json({ success: false, message: "Unauthorized access." });
		}

		const student = await Student.findById(studentId).select("-password -__v");
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

		const student = await Student.findById(studentId).select("-password -__v");
		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		return res.status(200).json({ success: true, data: student });
	}catch(error){
		console.error("Error in getStudentById : ", error);
		return res.status(500).json({success: false, message: "Server Error"});
	}

}; 


module.exports = {addStudentDetails, getStudentById ,getStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords, exportAllStudentsToExcel };
