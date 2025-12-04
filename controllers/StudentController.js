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

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const ExcelJS = require("exceljs"); // replaced xlsx

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
		maxSize: 500 * 1024, // 500KB
		friendlyName: "Student Photo"
	},
];

// Helper to safely get cell value as string
const getCellValue = (cell) => {
  if (!cell) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "number") return cell.toString();
  if (cell?.text) return cell.text.trim();       // rich text
  if (cell?.hyperlink) return cell.hyperlink;    // hyperlink type
  return "";
};



const importExcelDataWithPasswords = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty"
      });
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values
      .slice(1)
      .map(h => h?.toString().trim().toLowerCase());

    const studentIDColIndex = headers.findIndex(h => h.includes("studentid")) + 1;
    const emailColIndex = headers.findIndex(h => h.includes("email")) + 1;

    if (studentIDColIndex === 0 || emailColIndex === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel must contain 'studentID' and 'email' columns"
      });
    }

    const rawData = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      rawData.push({
        studentID: getCellValue(row.getCell(studentIDColIndex)),
        email: getCellValue(row.getCell(emailColIndex))
      });
    });

    const filteredData = rawData.filter(i => i.studentID && i.email);

    if (filteredData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid studentID or email fields found"
      });
    }

    if (filteredData.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Excel file can contain max 100 students due to email limits."
      });
    }

    const studentsToSave = [];
    const emailJobs = [];
    const failedStudents = [];

    for (const data of filteredData) {
      const { error } = importExcelSchema.validate(data, { abortEarly: false });

      if (error) {
        failedStudents.push({
          studentID: data.studentID,
          email: data.email,
          error: error.details.map(e => ({
            field: e.path[0],
            message: e.message
          }))
        });
        continue;
      }

      const randomPassword = generateRandomPassword(14);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      studentsToSave.push({
        studentID: data.studentID,
        email: data.email,
        password: hashedPassword
      });

      emailJobs.push({
        studentID: data.studentID,
        email: data.email,
        password: randomPassword
      });
    }

    // -------- Save all students in one DB call --------
    let insertedStudents = [];

    if (studentsToSave.length > 0) {
      try {
        insertedStudents = await Student.insertMany(studentsToSave, { ordered: false });
      } catch (err) {
        console.error("Insert many error:", err.message);
      }
    }

    // -------- Send email in batches: 5 emails, 3s delay --------
    const BATCH_SIZE = 5;
    const DELAY = 3000;

    const sendWithDelay = (ms) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < emailJobs.length; i += BATCH_SIZE) {
      const batch = emailJobs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(job =>
          sgMail.send({
            to: job.email,
            from: process.env.SENDGRID_VERIFIED_SENDER,
            subject: "Your Account Password",
            text: `Hello ${job.studentID},

Your account has been created.

Email: ${job.email}
Password: ${job.password}`
          }).catch(err => {
            console.error(`❌ Email failed for ${job.studentID}:`, err.message);

            failedStudents.push({
              studentID: job.studentID,
              email: job.email,
              error: "Email failed to send"
            });
          })
        )
      );

      if (i + BATCH_SIZE < emailJobs.length) {
        await sendWithDelay(DELAY);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import completed`,
      summary: {
        received: filteredData.length,
        inserted: insertedStudents.length,
        emailed: emailJobs.length - failedStudents.length,
        failed: failedStudents.length
      },
      failedStudents
    });

  } catch (error) {
    console.error("Import error:", error);
    return res.status(500).json({
      success: false,
      message: "Error importing Excel data"
    });
  }
};


// --- exportAllStudentsToExcel ---
const exportAllStudentsToExcel = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
    }

    const students = await Student.find();
    if (!students || students.length === 0) {
      return res.status(404).json({ success: false, message: "No students found in the database." });
    }

    // --- Create workbook and sheet using ExcelJS ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");

    worksheet.columns = [
  { header: "StudentID", key: "StudentID", width: 20 },
  { header: "PRN", key: "PRN", width: 20 },

  { header: "First Name", key: "FirstName", width: 20 },
  { header: "Middle Name", key: "MiddleName", width: 20 },
  { header: "Last Name", key: "LastName", width: 20 },
  { header: "Mother Name", key: "MotherName", width: 20 },

  { header: "Email", key: "Email", width: 30 },
  { header: "Parent Email", key: "ParentEmail", width: 30 },

  { header: "Mobile No", key: "MobileNo", width: 15 },
  { header: "Parent Mobile No", key: "ParentMobileNo", width: 15 },

  { header: "ABC ID", key: "ABCID", width: 25 },

  { header: "Branch", key: "Branch", width: 20 },
  { header: "Year", key: "Year", width: 10 },

  { header: "DOB", key: "DOB", width: 15 },
  { header: "Blood Group", key: "BloodGroup", width: 10 },
  { header: "Category", key: "Category", width: 15 },

  // Current Address
  { header: "Current Street", key: "CurrentStreet", width: 30 },
  { header: "Current City", key: "CurrentCity", width: 20 },
  { header: "Current Pincode", key: "CurrentPincode", width: 15 },

  // Native Address
  { header: "Native Street", key: "NativeStreet", width: 30 },
  { header: "Native City", key: "NativeCity", width: 20 },
  { header: "Native Pincode", key: "NativePincode", width: 15 },

  // Photo
  { header: "Student Photo URL", key: "StudentPhotoURL", width: 50 },
  { header: "Student Photo Public ID", key: "StudentPhotoPublicId", width: 50 },

  // Timestamps
  { header: "Created At", key: "CreatedAt", width: 30 },
  { header: "Updated At", key: "UpdatedAt", width: 30 },
];


    // Add rows
    const formattedData = students.map((student) => ({
  StudentID: student.studentID || "",
  PRN: student.PRN || "",

  FirstName: student.name?.firstName || "",
  MiddleName: student.name?.middleName || "",
  LastName: student.name?.lastName || "",
  MotherName: student.name?.motherName || "",

  Email: student.email || "",
  ParentEmail: student.parentEmail || "",

  MobileNo: student.mobileNo || "",
  ParentMobileNo: student.parentMobileNo || "",

  ABCID: student.abcId || "",

  Branch: student.branch || "",
  Year: student.year || "",

  DOB: student.dob
    ? new Date(student.dob).toLocaleDateString("en-GB")
    : "",

  BloodGroup: student.bloodGroup || "",
  Category: student.category || "",

  // Current Address
  CurrentStreet: student.currentAddress?.street || "",
  CurrentCity: student.currentAddress?.city || "",
  CurrentPincode: student.currentAddress?.pincode || "",

  // Native Address
  NativeStreet: student.nativeAddress?.street || "",
  NativeCity: student.nativeAddress?.city || "",
  NativePincode: student.nativeAddress?.nativePincode || "",

  // Photo
  StudentPhotoURL: student.studentPhoto?.url || "",

  // Timestamps
  CreatedAt: student.createdAt
    ? new Date(student.createdAt).toLocaleString()
    : "",
  UpdatedAt: student.updatedAt
    ? new Date(student.updatedAt).toLocaleString()
    : "",
}));


    worksheet.addRows(formattedData);

    // Send as download directly
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=StudentsData.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
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
