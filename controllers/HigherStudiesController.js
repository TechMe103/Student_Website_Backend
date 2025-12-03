const HigherStudies = require("../models/HigherStudies");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const { deleteMultipleFromCloudinary } = require("../helpers/DeleteMultipleFromCloudinary");
const { validateAndUploadFiles } = require("../helpers/ValidateAndUploadFiles");
const mongoose = require("mongoose");

const { createHigherStudySchema, updateHigherStudySchema, getHigherStudiesValidation } = require("../validators/higherStudiesValidation");

const fileConfigs = [
  {
    fieldName: "marksheet",
    allowedTypes: ["application/pdf"],
    maxSize: 5 * 1024 * 1024,
    friendlyName: "Marksheet"
  },
  {
    fieldName: "idCardPhoto",
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
    maxSize: 5 * 1024 * 1024,
    friendlyName: "ID Card Photo"
  }
];

// --------------------------- CREATE HIGHER STUDY --------------------------- //
const createHigherStudy = async (req, res) => {
    let uploadedFiles;
    let dbSaved = false;

    try {
        let stuID;
        if (req.user.role === "student") stuID = req.user.id;
        else if (req.user.role === "admin") {
            stuID = req.body.studentId;
            const student = await Student.findById(stuID);
            if (!student) return res.status(404).json({ success: false, message: "Student not found." });
        }

        const { examName, score } = req.body;

        // Validate input
        const { error } = createHigherStudySchema.validate({ examName, score }, { abortEarly: false });
        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
			return res.status(400).json({ success: false, message: "Marksheet and Id card Photo required." });
		}

        uploadedFiles = await validateAndUploadFiles(req.files, fileConfigs);

        const higherStudy = new HigherStudies({
            stuID,
            examName,
            score,
            marksheet: uploadedFiles.marksheet,
            idCardPhoto: uploadedFiles.idCardPhoto
        });

        await higherStudy.save();
        dbSaved = true;

        return res.status(201).json({ success: true, message: "Higher study record created.", data: higherStudy });
    } catch (err) {
        console.error("Error in createHigherStudy:", err);
        if (!dbSaved && uploadedFiles) {
            const publicIds = Object.values(uploadedFiles).map(f => f.publicId);
            await deleteMultipleFromCloudinary(publicIds);
        }
        return res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
};

// --------------------------- GET SINGLE HIGHER STUDY --------------------------- //
const getSingleHigherStudy = async (req, res) => {
    try {
        const { higherStudyId } = req.params;

        if (!higherStudyId) return res.status(400).json({ success: false, message: "HigherStudy ID is required" });
        if (!mongoose.Types.ObjectId.isValid(higherStudyId)) return res.status(400).json({ success: false, message: "Invalid ID format" });

        const higherStudy = await HigherStudies.findById(higherStudyId).populate({ path: "stuID", select: "name branch year" });
        if (!higherStudy) return res.status(404).json({ success: false, message: "Higher study record not found" });

        if (req.user.role === "student" && higherStudy.stuID._id.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied: record does not belong to you" });
        }

        return res.status(200).json({ success: true, data: higherStudy });
    } catch (err) {
        console.error("Error in getSingleHigherStudy:", err);
        return res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
};

// --------------------------- GET HIGHER STUDIES (Admin with filters) --------------------------- //
const getHigherStudies = async (req, res) => {
    try {
        const adminId = req.user.id;
        const adminExists = await Admin.exists({ _id: adminId });
        if (!adminExists) return res.status(403).json({ success: false, message: "Unauthorized" });

        const { year, search, page, limit, examName } = req.query;
        const { error, value } = getHigherStudiesValidation.validate({ year, search, page, limit, examName }, { abortEarly: false });
        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const pageNum = value.page || 1;
        const limitNum = Math.min(value.limit || 10, 20);
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            { $lookup: { from: "students", localField: "stuID", foreignField: "_id", as: "student" } },
            { $unwind: {
                path: "$student",
                preserveNullAndEmptyArrays: true
                } 
            }
        ];

        const match = {};
        if (year) match["student.year"] = year.trim();
        if (examName) match["examName"] = examName.trim();
        if (search) {
            const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            match.$or = [
                { "student.name.firstName": { $regex: safeSearch, $options: "i" } },
                { "student.name.middleName": { $regex: safeSearch, $options: "i" } },
                { "student.name.lastName": { $regex: safeSearch, $options: "i" } },
                { examName: { $regex: safeSearch, $options: "i" } },
            ];
        }

        if (Object.keys(match).length) pipeline.push({ $match: match });

        const results = await HigherStudies.aggregate([
            ...pipeline,
            {
                $facet: {
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limitNum },
                        { $project: { stuID: "$student._id", studentName: "$student.name", studentYear: "$student.year", examName: 1, score: 1, marksheet: 1, idCardPhoto: 1 } }
                    ],
                    totalCount: [{ $count: "total" }]
                }
            }
        ]);

        const higherStudies = results[0]?.data || [];
        const total = results[0]?.totalCount[0]?.total || 0;

        return res.status(200).json({ success: true, data: higherStudies, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (err) {
        console.error("Error in getHigherStudies:", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// --------------------------- GET HIGHER STUDIES OF LOGGED-IN STUDENT --------------------------- //
const getOwnHigherStudies = async (req, res) => {
    try {
        const studentId = req.user.id;
        const studies = await HigherStudies.find({ stuID: studentId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: studies });
    } catch (err) {
        console.error("Error in getOwnHigherStudies:", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// --------------------------- GET HIGHER STUDIES BY STUDENT ID (Admin) --------------------------- //
const getHigherStudiesByStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: "Invalid student ID" });

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const studies = await HigherStudies.find({ stuID: studentId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: studies });
    } catch (err) {
        console.error("Error in getHigherStudiesByStudent:", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// --------------------------- UPDATE HIGHER STUDY --------------------------- //
const updateHigherStudy = async (req, res) => {
    let dbSaved = false;
    let newPublicIds = [];

    try {
        const { higherStudyId } = req.params;
        if (!higherStudyId || !mongoose.Types.ObjectId.isValid(higherStudyId)) return res.status(400).json({ success: false, message: "Invalid higherStudy ID" });

        const existingStudy = await HigherStudies.findById(higherStudyId);
        if (!existingStudy) return res.status(404).json({ success: false, message: "Higher study record not found" });

        if (req.user.role === "student" && existingStudy.stuID.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied: record does not belong to you" });
        }

        const { examName, score } = req.body;
        const { error } = updateHigherStudySchema.validate({ examName, score }, { abortEarly: false });
        if (error) {
            const validationErrors = error.details.map(err => ({ field: err.path[0], message: err.message }));
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const updatedData = {};
        if (examName) updatedData.examName = examName;
        if (score !== undefined) updatedData.score = score;

        const filteredFiles = {};
        if (req.files?.marksheet?.length > 0) filteredFiles.marksheet = req.files.marksheet;
        if (req.files?.idCardPhoto?.length > 0) filteredFiles.idCardPhoto = req.files.idCardPhoto;

        const activeConfigs = fileConfigs.filter(cfg => filteredFiles[cfg.fieldName]);
        let uploadedFiles = {};
        if (Object.keys(filteredFiles).length > 0) uploadedFiles = await validateAndUploadFiles(filteredFiles, activeConfigs);

        if (uploadedFiles.marksheet) {
            if (existingStudy.marksheet?.publicId) await cloudinary.uploader.destroy(existingStudy.marksheet.publicId).catch(() => {});
            updatedData.marksheet = uploadedFiles.marksheet;
            newPublicIds.push(uploadedFiles.marksheet.publicId);
        }
        if (uploadedFiles.idCardPhoto) {
            if (existingStudy.idCardPhoto?.publicId) await cloudinary.uploader.destroy(existingStudy.idCardPhoto.publicId).catch(() => {});
            updatedData.idCardPhoto = uploadedFiles.idCardPhoto;
            newPublicIds.push(uploadedFiles.idCardPhoto.publicId);
        }

        const updatedStudy = await HigherStudies.findByIdAndUpdate(higherStudyId, { $set: updatedData }, { new: true, runValidators: true });
        dbSaved = true;

        return res.status(200).json({ success: true, message: "Higher study record updated.", data: updatedStudy });

    } catch (err) {
        console.error("Error in updateHigherStudy:", err);
        if (!dbSaved && newPublicIds.length > 0) await deleteMultipleFromCloudinary(newPublicIds);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// --------------------------- DELETE HIGHER STUDY --------------------------- //
const deleteHigherStudy = async (req, res) => {
    try {
        const { higherStudyId } = req.params;
        if (!higherStudyId || !mongoose.Types.ObjectId.isValid(higherStudyId)) return res.status(400).json({ success: false, message: "Invalid ID" });

        const study = await HigherStudies.findById(higherStudyId);
        if (!study) return res.status(404).json({ success: false, message: "Higher study record not found" });

        if (req.user.role === "student" && study.stuID.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const publicIdsToDelete = [];
        if (study.marksheet?.publicId) publicIdsToDelete.push(study.marksheet.publicId);
        if (study.idCardPhoto?.publicId) publicIdsToDelete.push(study.idCardPhoto.publicId);

        await HigherStudies.findByIdAndDelete(higherStudyId);

        try{
            await deleteMultipleFromCloudinary(publicIdsToDelete);
        }catch(err){
            console.error(err);
        }

        return res.status(200).json({ success: true, message: "Higher study record deleted." });
    } catch (err) {
        console.error("Error in deleteHigherStudy:", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    createHigherStudy,
    getHigherStudies,
    getOwnHigherStudies,
    getHigherStudiesByStudent,
    getSingleHigherStudy,
    updateHigherStudy,
    deleteHigherStudy
};
