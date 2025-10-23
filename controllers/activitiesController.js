const Activity = require("../models/Activity");
const Student = require("../models/Student");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const { activitySchema } = require("../validators/activitiesValidation");

//CREATE Activity (with certificate upload)
const createActivity = async(req , res) => {
    try {
    const studentId = req.user.id;

    // Validate input
    const { error } = activitySchema.validate(req.body);
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    // Upload certificate if available
    let certificateURL = "";
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path, "certificates");
      certificateURL = uploaded.url;
    }

    const newActivity = new Activity({
      stuID: studentId,
      ...req.body,
      certificateURL,
    });

    await newActivity.save();
    res.status(201).json({
      success: true,
      message: "Activity created successfully",
      data: newActivity,
    });
  } catch (err) {
    console.error("Error creating activity:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//GET all activities by a student => logged-in
const getActivityByStu = async (req, res) => {
  try {
    const studentId = req.user.id;
    const activities = await Activity.find({ stuID: studentId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: activities });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


//GET activities by student ID (Admin only)
const getActivitiesByStudentAdmin = async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ success: false, message: "Access denied" });

    const activities = await Activity.find({ stuID: req.params.studentId })
      .populate("stuID", "name roll branch year");

    res.status(200).json({ success: true, data: activities });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// UPDATE Activity (Student only)
const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const activity = await Activity.findById(id);
    if (!activity)
      return res.status(404).json({ success: false, message: "Activity not found" });

    if (activity.stuID.toString() !== studentId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    // Validate input
    const { error } = activitySchema.validate(req.body, { allowUnknown: true });
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    // Update data
    Object.assign(activity, req.body);
    await activity.save();

    res.status(200).json({ success: true, message: "Activity updated successfully", data: activity });
  } catch (err) {
    console.error("Error updating activity:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// DELETE Activity (Student only)
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const activity = await Activity.findById(id);
    if (!activity)
      return res.status(404).json({ success: false, message: "Activity not found" });

    if (activity.stuID.toString() !== studentId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    await activity.remove();
    res.status(200).json({ success: true, message: "Activity deleted successfully" });
  } catch (err) {
    console.error("Error deleting activity:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET All Activities (Admin only)
const getAllActivities = async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ success: false, message: "Access denied" });

    const activities = await Activity.find()
      .populate("stuID", "name roll branch year")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: activities });
  } catch (err) {
    console.error("Error fetching all activities:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


module.exports = { createActivity , getActivityByStu , getActivitiesByStudentAdmin , updateActivity , deleteActivity , getAllActivities};