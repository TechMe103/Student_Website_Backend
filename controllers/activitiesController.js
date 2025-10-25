const Activity = require("../models/Activity");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const { activitySchema } = require("../validators/activitiesValidation");
const cloudinary = require("../config/cloudinaryConfig");

// Allowed certificate size/type
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_CERT_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

// Helper to validate file
const validateFile = (file, allowedTypes, maxSize) => {
  if (!file) return false;
  if (!allowedTypes.includes(file.mimetype)) return false;
  if (file.size > maxSize) return false;
  return true;
};

// Safe delete from Cloudinary
const safeDeleteFile = async (publicId) => {
  try {
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Error deleting file from Cloudinary:", err);
  }
};

// CREATE Activity (Student only)
const createActivity = async (req, res) => {
  let uploadedFileId = null;
  try {
    const { id, role } = req.user;
    if (role !== "student") return res.status(403).json({ success: false, message: "Only students can create activities" });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const { error } = activitySchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    let certificate = null;
    if (req.file) {
      if (!validateFile(req.file, ALLOWED_CERT_TYPES, MAX_FILE_SIZE))
        return res.status(400).json({ success: false, message: "Certificate must be JPG/PNG/PDF and <= 5MB" });

      certificate = await uploadToCloudinary(req.file.path, "certificates");
      uploadedFileId = certificate.publicId;
    }

    const newActivity = new Activity({
      stuID: id,
      ...req.body,
      certificateURL: certificate ? { url: certificate.url, publicId: certificate.publicId } : null,
    });

    const populated = await newActivity.populate("stuID", "name roll branch year");
    await newActivity.save();

    res.status(201).json({ success: true, message: "Activity created successfully", data: populated });
  } catch (err) {
    if (uploadedFileId) await safeDeleteFile(uploadedFileId);
    console.error("Error creating activity:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET Activities by Student (logged-in)
const getActivityByStu = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "student") return res.status(403).json({ success: false, message: "Only students can view their activities" });

    const activities = await Activity.find({ stuID: id })
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: activities });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET Activities by Student ID (Admin only)
// GET Activities by Student ID (Admin only) with search/filter/pagination
const getActivitiesByStudentAdmin = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "admin") return res.status(403).json({ success: false, message: "Only admins can view activities" });

    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const { search, type, studentName, page = 1, limit = 10 } = req.query;
    const query = { stuID: req.params.studentId };

    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    let activitiesQuery = Activity.find(query)
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    if (studentName) {
      activitiesQuery = activitiesQuery.populate({
        path: "stuID",
        match: { name: { $regex: studentName, $options: "i" } },
      });
    }

    const activities = await activitiesQuery.skip(parseInt(skip)).limit(parseInt(limit));
    const total = await Activity.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: activities.filter(act => act.stuID), // remove null populated students
    });
  } catch (err) {
    console.error("Error fetching student activities:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// UPDATE Activity (Student only)
const updateActivity = async (req, res) => {
  let uploadedFileId = null;
  try {
    const { id: userId, role } = req.user;
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: "Activity not found" });

    if (role === "student" && activity.stuID.toString() !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (role === "admin") {
      const admin = await Admin.findById(userId);
      if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    const { error } = activitySchema.validate(req.body, { presence: "optional" });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    if (req.file) {
      if (!validateFile(req.file, ALLOWED_CERT_TYPES, MAX_FILE_SIZE))
        return res.status(400).json({ success: false, message: "Certificate must be JPG/PNG/PDF and <= 5MB" });

      if (activity.certificateURL?.publicId) await safeDeleteFile(activity.certificateURL.publicId);
      const uploaded = await uploadToCloudinary(req.file.path, "certificates");
      uploadedFileId = uploaded.publicId;
      activity.certificateURL = { url: uploaded.url, publicId: uploaded.publicId };
    }

    Object.assign(activity, req.body);
    await activity.save();

    res.status(200).json({ success: true, message: "Activity updated successfully", data: activity });
  } catch (err) {
    if (uploadedFileId) await safeDeleteFile(uploadedFileId);
    console.error("Error updating activity:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// DELETE Activity (Student only)
const deleteActivity = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: "Activity not found" });

    if (role === "student" && activity.stuID.toString() !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (role === "admin") {
      const admin = await Admin.findById(userId);
      if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    if (activity.certificateURL?.publicId) await safeDeleteFile(activity.certificateURL.publicId);
    await activity.deleteOne();

    res.status(200).json({ success: true, message: "Activity deleted successfully" });
  } catch (err) {
    console.error("Error deleting activity:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET All Activities (Admin only) with search/filter/pagination & student-name search
const getAllActivities = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });

    const admin = await Admin.findById(id);
    if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });

    const { type, search, studentName, page = 1, limit = 10 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    let activitiesQuery = Activity.find(query)
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    if (studentName) {
      activitiesQuery = activitiesQuery.populate({
        path: "stuID",
        match: { name: { $regex: studentName, $options: "i" } },
      });
    }

    const skip = (page - 1) * limit;
    const activities = await activitiesQuery.skip(parseInt(skip)).limit(parseInt(limit));
    const total = await Activity.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: activities.filter(act => act.stuID),
    });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  createActivity,
  getActivityByStu,
  getActivitiesByStudentAdmin,
  updateActivity,
  deleteActivity,
  getAllActivities,
};
