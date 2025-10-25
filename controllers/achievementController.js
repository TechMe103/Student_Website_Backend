const Achievement = require("../models/Achievement");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const cloudinary = require("../config/cloudinaryConfig");
const { achievementSchema } = require("../validators/achievementValidation");

// Allowed types & size
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_REPORT_TYPE = "application/pdf";

// Helper to validate files
const validateFile = (file, allowedTypes, maxSize) => {
  if (!file) return false;
  if (!allowedTypes.includes(file.mimetype)) return false;
  if (file.size > maxSize) return false;
  return true;
};

// Helper to delete files safely
const safeDeleteFile = async (publicId) => {
  try {
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Error deleting file from Cloudinary:", err);
  }
};

// CREATE Achievement (Student only)
const createAchievement = async (req, res) => {
  let uploadedFiles = [];
  try {
    const { id, role } = req.user;
    if (role !== "student")
      return res.status(403).json({ success: false, message: "Only students can add achievements" });

    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    // Validate input
    const { error } = achievementSchema.validate(req.body);
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    // Validate required files
    const eventPhotoFile = req.files?.eventPhoto?.[0];
    const certificateFile = req.files?.certificate?.[0];
    const reportFile = req.files?.report?.[0]; // optional PDF

    if (!eventPhotoFile || !certificateFile)
      return res.status(400).json({ success: false, message: "Both event photo and certificate are required" });

    // File type & size validation
    if (!validateFile(eventPhotoFile, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE))
      return res.status(400).json({ success: false, message: "Event photo must be JPG/PNG and <= 5MB" });

    if (!validateFile(certificateFile, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE))
      return res.status(400).json({ success: false, message: "Certificate must be JPG/PNG and <= 5MB" });

    if (reportFile && !validateFile(reportFile, [ALLOWED_REPORT_TYPE], MAX_FILE_SIZE))
      return res.status(400).json({ success: false, message: "Report must be PDF and <= 5MB" });

    // Upload files
    const eventPhoto = await uploadToCloudinary(eventPhotoFile.path);
    uploadedFiles.push(eventPhoto.publicId);

    const certificate = await uploadToCloudinary(certificateFile.path);
    uploadedFiles.push(certificate.publicId);

    let report = null;
    if (reportFile) {
      report = await uploadToCloudinary(reportFile.path);
      uploadedFiles.push(report.publicId);
    }

    // Save record
    const achievement = new Achievement({
      stuID: id,
      ...req.body,
      photographs: {
        eventPhoto: { url: eventPhoto.url, publicId: eventPhoto.publicId },
        certificate: { url: certificate.url, publicId: certificate.publicId },
        ...(report ? { report: { url: report.url, publicId: report.publicId } } : {}),
      },
    });

    const populated = await achievement.populate("stuID", "name roll branch year");
    await achievement.save();

    res.status(201).json({ success: true, message: "Achievement added successfully", data: populated });
  } catch (err) {
    // Cleanup uploaded files if DB save fails
    for (const publicId of uploadedFiles) {
      await safeDeleteFile(publicId);
    }
    console.error("Error creating achievement:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// UPDATE Achievement (Student/Admin)
const updateAchievement = async (req, res) => {
  let uploadedFiles = [];
  try {
    const { id, role } = req.user;
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement)
      return res.status(404).json({ success: false, message: "Achievement not found" });

    if (role === "student" && achievement.stuID.toString() !== id)
      return res.status(403).json({ success: false, message: "Not authorized to update this record" });

    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin)
        return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    const { error } = achievementSchema.validate(req.body, { presence: "optional" });
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    // Handle file updates
    if (req.files?.eventPhoto) {
      const file = req.files.eventPhoto[0];
      if (!validateFile(file, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE))
        return res.status(400).json({ success: false, message: "Event photo must be JPG/PNG and <= 5MB" });

      await cloudinary.uploader.destroy(achievement.photographs.eventPhoto.publicId);
      const newEventPhoto = await uploadToCloudinary(file.path);
      uploadedFiles.push(newEventPhoto.publicId);
      achievement.photographs.eventPhoto = { url: newEventPhoto.url, publicId: newEventPhoto.publicId };
    }

    if (req.files?.certificate) {
      const file = req.files.certificate[0];
      if (!validateFile(file, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE))
        return res.status(400).json({ success: false, message: "Certificate must be JPG/PNG and <= 5MB" });

      await cloudinary.uploader.destroy(achievement.photographs.certificate.publicId);
      const newCertificate = await uploadToCloudinary(file.path);
      uploadedFiles.push(newCertificate.publicId);
      achievement.photographs.certificate = { url: newCertificate.url, publicId: newCertificate.publicId };
    }

    if (req.files?.report) {
      const file = req.files.report[0];
      if (!validateFile(file, [ALLOWED_REPORT_TYPE], MAX_FILE_SIZE))
        return res.status(400).json({ success: false, message: "Report must be PDF and <= 5MB" });

      if (achievement.photographs.report)
        await cloudinary.uploader.destroy(achievement.photographs.report.publicId);

      const newReport = await uploadToCloudinary(file.path);
      uploadedFiles.push(newReport.publicId);
      achievement.photographs.report = { url: newReport.url, publicId: newReport.publicId };
    }

    Object.assign(achievement, req.body);
    await achievement.save();

    res.status(200).json({ success: true, message: "Achievement updated successfully", data: achievement });
  } catch (err) {
    for (const publicId of uploadedFiles) {
      await safeDeleteFile(publicId);
    }
    console.error("Error updating achievement:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// DELETE Achievement (Student/Admin)
const deleteAchievement = async (req, res) => {
  try {
    const { id, role } = req.user;
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement)
      return res.status(404).json({ success: false, message: "Achievement not found" });

    if (role === "student" && achievement.stuID.toString() !== id)
      return res.status(403).json({ success: false, message: "Not authorized to delete this record" });

    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin)
        return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    for (const key of Object.keys(achievement.photographs)) {
      await safeDeleteFile(achievement.photographs[key].publicId);
    }
    await achievement.deleteOne();

    res.status(200).json({ success: true, message: "Achievement deleted successfully" });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET functions with search, filter, pagination, and student-name search
const getOwnAchievements = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "student")
      return res.status(403).json({ success: false, message: "Only students can view their achievements" });

    const achievements = await Achievement.find({ stuID: id })
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: achievements });
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllAchievements = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "admin")
      return res.status(403).json({ success: false, message: "Only admins can view all achievements" });

    const admin = await Admin.findById(id);
    if (!admin)
      return res.status(403).json({ success: false, message: "Admin not authorized" });

    const { category, achievementType, search, studentName, page = 1, limit = 10 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (achievementType) query.achievementType = achievementType;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { issuedBy: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    let achievementsQuery = Achievement.find(query).populate("stuID", "name roll branch year").sort({ createdAt: -1 });

    if (studentName) {
      achievementsQuery = achievementsQuery.populate({
        path: "stuID",
        match: { name: { $regex: studentName, $options: "i" } },
      });
    }

    const achievements = await achievementsQuery.skip(parseInt(skip)).limit(parseInt(limit));

    const total = await Achievement.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: achievements,
    });
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getStudentAchievementsByAdmin = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { studentId } = req.params;

    if (role !== "admin")
      return res.status(403).json({ success: false, message: "Only admins can view student achievements" });

    const student = await Student.findById(studentId);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const { category, achievementType, search, page = 1, limit = 10 } = req.query;
    const query = { stuID: studentId };

    if (category) query.category = category;
    if (achievementType) query.achievementType = achievementType;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { issuedBy: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const achievements = await Achievement.find(query)
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Achievement.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: achievements,
    });
  } catch (err) {
    console.error("Error fetching student achievements:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getOwnAchievements,
  getAllAchievements,
  getStudentAchievementsByAdmin,
};
