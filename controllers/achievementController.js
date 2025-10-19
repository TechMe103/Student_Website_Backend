const Achievement = require("../models/Achievement");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const cloudinary = require("../config/cloudinaryConfig");

// CREATE Achievement
const createAchievement = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Validate files
    const eventPhotoFile = req.files?.eventPhoto?.[0];
    const certificateFile = req.files?.certificate?.[0];

    if (!eventPhotoFile || !certificateFile) {
      return res.status(400).json({ success: false, message: "Both event photo and certificate are required" });
    }

    // Upload files to Cloudinary
    const eventPhoto = await uploadToCloudinary(eventPhotoFile.path);
    const certificate = await uploadToCloudinary(certificateFile.path);

    const achievement = new Achievement({
      stuID: studentId,
      ...req.body,
      photographs: {
        eventPhoto: { url: eventPhoto.url, publicId: eventPhoto.publicId },
        certificate: { url: certificate.url, publicId: certificate.publicId },
      },
    });

    await achievement.save();
    res.status(201).json({ success: true, achievement });
  } catch (err) {
    console.error("Error creating achievement:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET Achievements by student
const getAchievementByStu = async (req, res) => {
  try {
    const achievements = await Achievement.find({ stuID: req.params.stuID }).populate(
      "stuID",
      "name roll branch"
    );
    res.status(200).json({ success: true, data: achievements });
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE Achievement
const updateAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ success: false, message: "Achievement not found" });
    }

    // Handle new file uploads
    if (req.files?.eventPhoto) {
      if (achievement.photographs.eventPhoto.publicId) {
        await cloudinary.uploader.destroy(achievement.photographs.eventPhoto.publicId);
      }
      const newEventPhoto = await uploadToCloudinary(req.files.eventPhoto[0].path);
      achievement.photographs.eventPhoto = { url: newEventPhoto.url, publicId: newEventPhoto.publicId };
    }

    if (req.files?.certificate) {
      if (achievement.photographs.certificate.publicId) {
        await cloudinary.uploader.destroy(achievement.photographs.certificate.publicId);
      }
      const newCertificate = await uploadToCloudinary(req.files.certificate[0].path);
      achievement.photographs.certificate = { url: newCertificate.url, publicId: newCertificate.publicId };
    }

    // Update other fields
    Object.assign(achievement, req.body);

    await achievement.save();
    res.status(200).json({ success: true, achievement });
  } catch (err) {
    console.error("Error updating achievement:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// DELETE Achievement
const deleteAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ success: false, message: "Achievement not found" });
    }

    // Delete files from Cloudinary
    if (achievement.photographs.eventPhoto.publicId) {
      await cloudinary.uploader.destroy(achievement.photographs.eventPhoto.publicId);
    }
    if (achievement.photographs.certificate.publicId) {
      await cloudinary.uploader.destroy(achievement.photographs.certificate.publicId);
    }

    await achievement.remove();
    res.status(200).json({ success: true, message: "Achievement deleted successfully" });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET all achievements (Admin)
const getAllAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find()
      .populate("stuID", "name branch year")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: achievements });
  } catch (err) {
    console.error("Error fetching all achievements:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  createAchievement,
  getAchievementByStu,
  updateAchievement,
  deleteAchievement,
  getAllAchievements,
};
