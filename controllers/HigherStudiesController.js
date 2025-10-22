const HigherStudies = require("../models/HigherStudies");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const { createHigherStudySchema, updateHigherStudySchema } = require("../validators/higherStudiesValidation")

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPE = "application/pdf";

// --------------------------- CREATE HIGHER STUDY (student) --------------------------- //
const createHigherStudy = async (req, res) => {
    let dbSaved = false;
    let uploadResult = null;

    try {
        const { id } = req.user;

        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const { examName, score } = req.body;

        // Validate input with Joi
        const { error } = createHigherStudySchema.validate({ examName, score }, { abortEarly: false });
        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const marksheetFile = req.file;
        if (!marksheetFile) return res.status(400).json({ success: false, message: "Marksheet file is required" });

        if (marksheetFile.mimetype !== ALLOWED_FILE_TYPE)
            return res.status(400).json({ success: false, message: "Marksheet must be a PDF" });

        if (marksheetFile.size > MAX_FILE_SIZE)
            return res.status(400).json({ success: false, message: "Marksheet exceeds 5MB" });

        uploadResult = await uploadToCloudinary(marksheetFile.path);

        const higherStudy = new HigherStudies({
            stuID: id,
            examName,
            score,
            marksheet: {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
            },
        });

        await higherStudy.save();
        dbSaved = true;

        res.status(201).json({ success: true, message: "Higher study record added successfully", data: higherStudy });
    } catch (err) {
        console.error("Error in createHigherStudy:", err);
        if (!dbSaved && uploadResult?.publicId) {
            await cloudinary.uploader.destroy(uploadResult.publicId);
        }
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// --------------------------- UPDATE HIGHER STUDY --------------------------- //
const updateHigherStudy = async (req, res) => {
    let uploadResult = null;
    let dbSaved = false;

    try {
        const userId = req.user.id;
        const { higherStudyId } = req.params;

        const existingStudy = await HigherStudies.findById(higherStudyId);
        if (!existingStudy) return res.status(404).json({ success: false, message: "Higher study record not found" });

        // Verify admin or student
        if (req.user.role === "admin") {
            const admin = await Admin.findById(userId);
            if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
        }

        if (req.user.role === "student") {
            const student = await Student.findById(userId);
            if (!student) return res.status(404).json({ success: false, message: "Student not found" });

            if (existingStudy.stuID.toString() !== userId.toString())
                return res.status(403).json({ success: false, message: "This record does not belong to the logged-in student" });
        }

        const { examName, score } = req.body;

        // Validate input with Joi
        const { error } = updateHigherStudySchema.validate({ examName, score }, { abortEarly: false });
        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const updatedData = {};
        if (examName) updatedData.examName = examName;
        if (score !== undefined) updatedData.score = score;

        const marksheetFile = req.file;
        if (marksheetFile) {
            if (marksheetFile.mimetype !== ALLOWED_FILE_TYPE)
                return res.status(400).json({ success: false, message: "Marksheet must be a PDF" });

            if (marksheetFile.size > MAX_FILE_SIZE)
                return res.status(400).json({ success: false, message: "Marksheet exceeds 5MB" });

            uploadResult = await uploadToCloudinary(marksheetFile.path);
            updatedData.marksheet = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
            };
        }

        const updatedStudy = await HigherStudies.findByIdAndUpdate(
            higherStudyId,
            { $set: updatedData },
            { new: true, runValidators: true }
        );
        dbSaved = true;

        // Delete previous marksheet if new uploaded
        if (updatedStudy && marksheetFile && existingStudy.marksheet?.publicId) {
            try {
                await cloudinary.uploader.destroy(existingStudy.marksheet.publicId);
            } catch (err) {
                console.error("Cloudinary delete failed:", err);
            }
        }

        res.status(200).json({ success: true, message: "Higher study record updated successfully", data: updatedStudy });
    } catch (err) {
        console.error("Error in updateHigherStudy:", err);
        if (!dbSaved && uploadResult?.publicId) {
            await cloudinary.uploader.destroy(uploadResult.publicId);
        }
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// --------------------------- DELETE HIGHER STUDY --------------------------- //
const deleteHigherStudy = async (req, res) => {
    try {
        const userId = req.user.id;
        const { higherStudyId } = req.params;

        const study = await HigherStudies.findById(higherStudyId);
        if (!study) return res.status(404).json({ success: false, message: "Higher study record not found" });

        if (req.user.role === "admin") {
            const admin = await Admin.findById(userId);
            if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
        }

        if (req.user.role === "student") {
            const student = await Student.findById(userId);
            if (!student) return res.status(404).json({ success: false, message: "Student not found" });

            if (study.stuID.toString() !== userId.toString())
                return res.status(403).json({ success: false, message: "This record does not belong to the logged-in student" });
        }

        const delResult = await HigherStudies.findByIdAndDelete(higherStudyId);

        if (delResult && study.marksheet?.publicId) {
            try {
                await cloudinary.uploader.destroy(study.marksheet.publicId);
            } catch (err) {
                console.error("Cloudinary delete failed:", err);
            }
        }

        res.status(200).json({ success: true, message: "Higher study record deleted successfully" });
    } catch (err) {
        console.error("Error in deleteHigherStudy:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    createHigherStudy,
    updateHigherStudy,
    deleteHigherStudy
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
