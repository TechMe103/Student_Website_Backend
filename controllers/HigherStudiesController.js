const HigherStudies=require("../models/HigherStudies")
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const cloudinary = require("../config/cloudinaryConfig");

// Create HigherStudy (student only)
const createHigherStudy = async (req, res) => {
	try {
		const studentId = req.user.id;

		const student = await Student.findById(studentId);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		const { examName, score } = req.body;
		if (!examName || score === undefined) {
		return res.status(400).json({ success: false, message: "Exam name and score are required" });
		}

		const marksheetFile = req.file;
		if (!marksheetFile) {
		return res.status(400).json({ success: false, message: "Marksheet file is required" });
		}

		const marksheetResult = await uploadToCloudinary(marksheetFile.path);

		const higherStudy = new HigherStudies({
			stuID: studentId,
			examName,
			score,
			marksheet: {
				url: marksheetResult.url,
				publicId: marksheetResult.publicId,
			},
		});

		await higherStudy.save();
		res.status(201).json({ success: true, data: higherStudy });
	} catch (err) {
		console.error("Error in createHigherStudy:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// Update HigherStudy (student/admin)
const updateHigherStudy = async (req, res) => {
	try {
		const userId = req.user.id;

		// Verify user
		if (req.user.role === "admin") {
			const admin = await Admin.findById(userId);
			if (!admin) {
				return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
			}
		}
		if (req.user.role === "student") {
			const student = await Student.findById(userId);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found" });
			}
		}

		const { higherStudyId } = req.params;
		const existingStudy = await HigherStudies.findById(higherStudyId);
		if (!existingStudy) return res.status(404).json({ success: false, message: "Higher study record not found" });

		const { examName, score } = req.body;
		const updatedData = {};
		if (examName) updatedData.examName = examName;
		if (score !== undefined) updatedData.score = score;

		const marksheetFile = req.file;
		if (marksheetFile) {
			if (existingStudy.marksheet?.publicId) {
				await cloudinary.uploader.destroy(existingStudy.marksheet.publicId);
			}
			const marksheetResult = await uploadToCloudinary(marksheetFile.path);
			updatedData.marksheet = {
				url: marksheetResult.url,
				publicId: marksheetResult.publicId,
			};
		}

		const updatedStudy = await HigherStudies.findByIdAndUpdate(higherStudyId, { $set: updatedData }, { new: true, runValidators: true });

		res.status(200).json({ success: true, message: "Higher study record updated", data: updatedStudy });
	} catch (err) {
		console.error("Error in updateHigherStudy:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// Delete HigherStudy (student/admin)
const deleteHigherStudy = async (req, res) => {
	try {
		const userId = req.user.id;

		// Verify user
		if (req.user.role === "admin") {
			const admin = await Admin.findById(userId);
			if (!admin) {
				return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
			}
		}
		if (req.user.role === "student") {
			const student = await Student.findById(userId);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found" });
			}
		}

		const { higherStudyId } = req.params;
		const study = await HigherStudies.findById(higherStudyId);
		if (!study) return res.status(404).json({ success: false, message: "Higher study record not found" });

		if (study.marksheet?.publicId) {
		await cloudinary.uploader.destroy(study.marksheet.publicId);
		}

		await HigherStudies.findByIdAndDelete(higherStudyId);

		res.status(200).json({ success: true, message: "Higher study record deleted" });
	} catch (err) {
		console.error("Error in deleteHigherStudy:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// Get all higher studies (admin only, populate student fields)
const getAllHigherStudies = async (req, res) => {
	try {
		const adminId=req.user.id;

		const admin = await Admin.findById(adminId);
		if (!admin) {
			return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}

		const studies = await HigherStudies.find()
		.populate({ path: "stuID", select: "name branch year" })
		.sort({ createdAt: -1 });

		res.status(200).json({ success: true, data: studies });
	} catch (err) {
		console.error("Error in getAllHigherStudies:", err);
		res.status(500).json({ success: false, message: "Server Error" });
	}
};

// Get higher studies by student ID
const getHigherStudiesByStudent = async (req, res) => {
	try {
		
		const userId = req.user.id;

		// Verify user
		if (req.user.role === "admin") {
			const admin = await Admin.findById(userId);
			if (!admin) {
				return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
			}
		}
		if (req.user.role === "student") {
			const student = await Student.findById(userId);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found" });
			}
		}

		const { studentId } = req.params;

		const student = await Student.findById(studentId);
		if (!student) return res.status(404).json({ success: false, message: "Student not found" });

		const studies = await HigherStudies.find({ stuID: studentId }).sort({ createdAt: -1 });
		res.status(200).json({ success: true, data: studies });
	} catch (err) {
		console.error("Error in getHigherStudiesByStudent:", err);
		res.status(500).json({ success: false, message: "Server Error" });
	}
};


// Get higher studies for logged-in student
const getOwnHigherStudies = async (req, res) => {
	try {
		const studentId = req.user.id;

		const student = await Student.findById(studentId);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		const studies = await HigherStudies.find({ stuID: studentId }).sort({ createdAt: -1 });

		res.status(200).json({ success: true, data: studies });
	} catch (err) {
		console.error("Error in getOwnHigherStudies:", err);
		res.status(500).json({ success: false, message: "Server Error" });
	}
};


module.exports = {
	createHigherStudy,
	updateHigherStudy,
	deleteHigherStudy,
	getAllHigherStudies,
	getHigherStudiesByStudent,
	getOwnHigherStudies,
};
