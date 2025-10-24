const Achievement = require("../models/Achievement");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const cloudinary = require("../config/cloudinaryConfig");
const { achievementSchema } = require("../validators/achievementValidation");


// CREATE Achievement (Student only)
const createAchievement = async (req, res) => {
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
    if (!eventPhotoFile || !certificateFile)
      return res.status(400).json({ success: false, message: "Both event photo and certificate are required" });

    // Upload files
    const eventPhoto = await uploadToCloudinary(eventPhotoFile.path);
    const certificate = await uploadToCloudinary(certificateFile.path);

    // Save record
    const achievement = new Achievement({
      stuID: id,
      ...req.body,
      photographs: {
        eventPhoto: { url: eventPhoto.url, publicId: eventPhoto.publicId },
        certificate: { url: certificate.url, publicId: certificate.publicId },
      },
    });

    await achievement.save();
    res.status(201).json({ success: true, message: "Achievement added successfully", data: achievement });
  } catch (err) {
    console.error("Error creating achievement:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// GET achievements by logged-in student (Student only)
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

// GET all achievements (Admin only)
// GET all achievements (Admin only) with search, filter, pagination
const getAllAchievements = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "admin")
      return res.status(403).json({ success: false, message: "Only admins can view all achievements" });

    const admin = await Admin.findById(id);
    if (!admin)
      return res.status(403).json({ success: false, message: "Admin not authorized" });

    // Extract query params
    const { category, achievementType, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Apply filters
    if (category) query.category = category;
    if (achievementType) query.achievementType = achievementType;

    // Apply search (by title or issuedBy)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { issuedBy: { $regex: search, $options: "i" } },
        // optional: search by student name
        { "stuID.name": { $regex: search, $options: "i" } },
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
    console.error("Error fetching achievements:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// GET achievements of a specific student (Admin only)
// GET achievements of a specific student (Admin only) with search & pagination
const getStudentAchievementsByAdmin = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { studentId } = req.params;

    if (role !== "admin")
      return res.status(403).json({ success: false, message: "Only admins can view student achievements" });

    const student = await Student.findById(studentId);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    // Extract query params
    const { category, achievementType, search, page = 1, limit = 10 } = req.query;

    const query = { stuID: studentId };

    // Filters
    if (category) query.category = category;
    if (achievementType) query.achievementType = achievementType;

    // Search by title or issuedBy
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

// UPDATE Achievement (Student/Admin)
const updateAchievement = async (req, res) => {
  try {
    const { id, role } = req.user;
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement)
      return res.status(404).json({ success: false, message: "Achievement not found" });

    // Authorization
    if (role === "student" && achievement.stuID.toString() !== id)
      return res.status(403).json({ success: false, message: "Not authorized to update this record" });

    // Admin check
    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin)
        return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    // Validate body (optional)
    const { error } = achievementSchema.validate(req.body, { presence: "optional" });
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    // Handle new file uploads
    if (req.files?.eventPhoto) {
      await cloudinary.uploader.destroy(achievement.photographs.eventPhoto.publicId);
      const newEventPhoto = await uploadToCloudinary(req.files.eventPhoto[0].path);
      achievement.photographs.eventPhoto = { url: newEventPhoto.url, publicId: newEventPhoto.publicId };
    }
    if (req.files?.certificate) {
      await cloudinary.uploader.destroy(achievement.photographs.certificate.publicId);
      const newCertificate = await uploadToCloudinary(req.files.certificate[0].path);
      achievement.photographs.certificate = { url: newCertificate.url, publicId: newCertificate.publicId };
    }

    // Update fields
    Object.assign(achievement, req.body);

    await achievement.save();
    res.status(200).json({ success: true, message: "Achievement updated successfully", data: achievement });
  } catch (err) {
    console.error("Error updating achievement:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// DELETE Achievement  (Student/Admin)
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

    await cloudinary.uploader.destroy(achievement.photographs.eventPhoto.publicId);
    await cloudinary.uploader.destroy(achievement.photographs.certificate.publicId);
    await achievement.deleteOne();

    res.status(200).json({ success: true, message: "Achievement deleted successfully" });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


module.exports = {
  createAchievement,
  getOwnAchievements,
  getAllAchievements,
  getStudentAchievementsByAdmin,
  updateAchievement,
  deleteAchievement,
};
