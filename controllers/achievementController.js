const Achievement = require("../models/Achievement");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const cloudinary = require("../config/cloudinaryConfig");
const { achievementSchema } = require("../validators/achievementValidation");

// Allowed types & size
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png"];

// Validate file type and size
const validateFile = (file, allowedTypes, maxSize) => {
  if (!file) return false;
  if (!allowedTypes.includes(file.mimetype)) return false;
  if (file.size > maxSize) return false;
  return true;
};

// Safely delete Cloudinary file
const safeDeleteFile = async (publicId) => {
  try {
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Error deleting file from Cloudinary:", err);
  }
};

// CREATE Achievement
const createAchievement = async (req, res) => {
  let uploadedFiles = [];
  try {
    const { id, role } = req.user;

    if (role !== "student")
      return res.status(403).json({
        success: false,
        message: "Only students can add achievements",
      });

    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });

    // Validate body
    const { error } = achievementSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    // Required files
    const eventPhotoFile = req.files?.eventPhoto?.[0];
    const certificateFile = req.files?.certificate?.[0];
    const certificationFile = req.files?.course_certificate?.[0]; // optional

    if (!eventPhotoFile || !certificateFile)
      return res.status(400).json({
        success: false,
        message: "Both event photo and certificate are required",
      });

    // Validate files
    if (!validateFile(eventPhotoFile, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE))
      return res.status(400).json({
        success: false,
        message: "Event photo must be JPG/PNG and <= 5MB",
      });

    if (!validateFile(certificateFile, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE))
      return res.status(400).json({
        success: false,
        message: "Certificate must be JPG/PNG and <= 5MB",
      });

    if (
      certificationFile &&
      !validateFile(certificationFile, ALLOWED_PROOF_TYPES, MAX_FILE_SIZE)
    )
      return res.status(400).json({
        success: false,
        message: "Certification file must be JPG/PNG and <= 5MB",
      });

    // Upload to Cloudinary
    const eventPhoto = await uploadToCloudinary(eventPhotoFile.path);
    uploadedFiles.push(eventPhoto.publicId);

    const certificate = await uploadToCloudinary(certificateFile.path);
    uploadedFiles.push(certificate.publicId);

    let course_certificate = null;
    if (certificationFile) {
      course_certificate = await uploadToCloudinary(
        certificationFile.path
      );
      uploadedFiles.push( course_certificate.publicId);
    }

    // Create new Achievement
    const achievement = new Achievement({
      stuID: id,
      ...req.body, // includes certification_course
      photographs: {
        eventPhoto: { url: eventPhoto.url, publicId: eventPhoto.publicId },
        certificate: { url: certificate.url, publicId: certificate.publicId },
      },
      course_certificate: course_certificate
        ? {
            url: course_certificate.url,
            publicId: course_certificate.publicId,
          }
        : {},
    });

    await achievement.save();

    const populated = await achievement.populate(
      "stuID",
      "name roll branch year"
    );

    res.status(201).json({
      success: true,
      message: "Achievement added successfully",
      data: populated,
    });
  } catch (err) {
    for (const publicId of uploadedFiles) {
      await safeDeleteFile(publicId);
    }
    console.error("Error creating achievement:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// UPDATE Achievement
const updateAchievement = async (req, res) => {
  let uploadedFiles = [];
  try {
    const { id, role } = req.user;
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement)
      return res
        .status(404)
        .json({ success: false, message: "Achievement not found" });

    if (role === "student" && achievement.stuID.toString() !== id)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to update" });

    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin)
        return res
          .status(403)
          .json({ success: false, message: "Admin not authorized" });
    }

    const { error } = achievementSchema.validate(req.body, {
      presence: "optional",
    });
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    // File replacements
    const fileUpdates = [
      { key: "eventPhoto", types: ALLOWED_PROOF_TYPES },
      { key: "certificate", types: ALLOWED_PROOF_TYPES },
      { key: "course_certificate", types: ALLOWED_PROOF_TYPES },
    ];

    for (const { key, types } of fileUpdates) {
      if (req.files?.[key]) {
        const file = req.files[key][0];
        if (!validateFile(file, types, MAX_FILE_SIZE))
          return res.status(400).json({
            success: false,
            message: `${key} file invalid or too large`,
          });

        // Delete old file if exists
        const existing =
          key === "course_certificate"
            ? achievement.course_certificate
            : achievement.photographs[key];

        if (existing?.publicId)
          await cloudinary.uploader.destroy(existing.publicId);

        const uploaded = await uploadToCloudinary(file.path);
        uploadedFiles.push(uploaded.publicId);

        if (key === "course_certificate") {
          achievement.course_certificate = {
            url: uploaded.url,
            publicId: uploaded.publicId,
          };
        } else {
          achievement.photographs[key] = {
            url: uploaded.url,
            publicId: uploaded.publicId,
          };
        }
      }
    }

    // Update text fields
    Object.assign(achievement, req.body);
    await achievement.save();

    res.status(200).json({
      success: true,
      message: "Achievement updated successfully",
      data: achievement,
    });
  } catch (err) {
    for (const publicId of uploadedFiles) {
      await safeDeleteFile(publicId);
    }
    console.error("Error updating achievement:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// DELETE Achievement
const deleteAchievement = async (req, res) => {
  try {
    const { id, role } = req.user;
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement)
      return res
        .status(404)
        .json({ success: false, message: "Achievement not found" });

    if (role === "student" && achievement.stuID.toString() !== id)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete" });

    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin)
        return res
          .status(403)
          .json({ success: false, message: "Admin not authorized" });
    }

    // Delete all associated files
    for (const key of Object.keys(achievement.photographs)) {
      await safeDeleteFile(achievement.photographs[key].publicId);
    }
    if (achievement.course_certificate?.publicId)
      await safeDeleteFile(achievement.course_certificate.publicId);

    await achievement.deleteOne();

    res.status(200).json({
      success: true,
      message: "Achievement deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET: Student’s Own Achievements
const getOwnAchievements = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "student")
      return res
        .status(403)
        .json({ success: false, message: "Only students can view this" });

    const achievements = await Achievement.find({ stuID: id })
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: achievements });
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET: All Achievements (Admin)
const getAllAchievements = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "admin")
      return res
        .status(403)
        .json({ success: false, message: "Only admins can view all achievements" });

    const admin = await Admin.findById(id);
    if (!admin)
      return res
        .status(403)
        .json({ success: false, message: "Admin not authorized" });

    const {
      category,
      achievementType,
      certification_course,
      search,
      studentName,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (achievementType) query.achievementType = achievementType;

    if (certification_course) {
      query.certification_course = { $regex: certification_course, $options: "i" };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { issuedBy: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    let achievementsQuery = Achievement.find(query)
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    if (studentName) {
      achievementsQuery = achievementsQuery.populate({
        path: "stuID",
        match: { name: { $regex: studentName, $options: "i" } },
      });
    }

    const achievements = await achievementsQuery
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
    console.error("Error fetching achievements:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET: Specific Student’s Achievements (Admin)
const getStudentAchievementsByAdmin = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { studentId } = req.params;

    if (role !== "admin")
      return res
        .status(403)
        .json({ success: false, message: "Only admins can view this" });

    const student = await Student.findById(studentId);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const {
      category,
      achievementType,
      certification_course,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { stuID: studentId };
    if (category) query.category = category;
    if (achievementType) query.achievementType = achievementType;

    if (certification_course) {
      query.certification_course = { $regex: certification_course, $options: "i" };
    }

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
