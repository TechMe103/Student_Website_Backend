const Activity = require("../models/Activity");
const Student = require("../models/Student");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");

//CREATE Activity (with certificate upload)
const createActivity = async(req , res) => {
    try {
    const studentId = req.user.id; // from verifyToken
    let certificateURL = "";

    // If a certificate file is uploaded
    if (req.file) {
        certificateURL = await uploadToCloudinary(req.file.path, "certificates");
    }

    const newActivity = new Activity({
        stuID: studentId,
        type: req.body.type,
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
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
    res.status(500).json({
        success: false,
        message: "Failed to create activity",
        error: err.message,
    });
    }
};

//GET all activities by a student
const getActivityByStu = async(req, res ) => {
    try {
    const activities = await Activity.find({ stuID: req.params.stuID })
      .populate("stuID", "name roll branch");

    if (!activities.length) {
      return res.status(404).json({
        success: false,
        message: "No activities found for this student",
      });
    }

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: err.message,
    });
  }
};

//UPDATE Activity
const updateActivity = async (req ,res) =>{
    try {
    const { id } = req.params;

    const updatedActivity = await Activity.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedActivity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activity updated successfully",
      data: updatedActivity,
    });
  } catch (err) {
    console.error("Error updating activity:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update activity",
      error: err.message,
    });
  }
};

//DELETE Activity
const deleteActivity = async(req , res) => {
    try {
    const { id } = req.params;
    const deleted = await Activity.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activity deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("Error deleting activity:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete activity",
      error: err.message,
    });
  }
};

//GET ALL Activities (for admin dashboard)
const getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.find().populate("stuID", "name roll branch");
    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (err) {
    console.error("Error fetching all activities:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: err.message,
    });
  }
};

module.exports = { createActivity , getActivityByStu , updateActivity , deleteActivity , getAllActivities};