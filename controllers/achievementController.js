const Achievement = require("../models/Achievement");
const {uploadToCloudinary}=require("../helpers/UploadToCloudinary.js");

// CREATE Achievement with Cloudinary uploads
const createAchievement = async (req, res) => {
  try {
    
    // Ensure both files are uploaded
    if (!req.files?.eventPhoto || !req.files?.certificate) {
      return res
        .status(400)
        .json({ error: "Both event photo and certificate are required" });
    }

    // Upload files to Cloudinary
    const eventPhotoURL = await uploadToCloudinary(req.files.eventPhoto[0].path);
    const certificateURL = await uploadToCloudinary(req.files.certificate[0].path);

    const achievement = new Achievement({
      ...req.body,
      photographs: {
        eventPhoto: eventPhotoURL,
        certificateURL: certificateURL,
      },
    });

    await achievement.save();
    res.status(201).json(achievement);
  } catch (err) {
    console.error("Error creating achievement:", err);
    res.status(500).json({ error: err.message });
  }
};



const getAchievementByStu = async( req, res) => {
    try{
        const achievement = await Achievement.find({ stuID : req.params.stuID }).populate("stuID" , "name roll branch");
        res.json(achievement);
    }catch(err) {
        console.error("Error fetching achievements:", err);
        res.status(500).json({ error : err.message });
    }
};

//support updating files too => images

const updateAchievement = async (req, res) => {
  try {
    let updateData = { ...req.body };

     // Initialize photographs object if needed
    updateData.photographs = updateData.photographs || {};

    // Upload new files if provided
    if (req.files?.eventPhoto) {
      updateData.photographs.eventPhoto = await uploadToCloudinary(
        req.files.eventPhoto[0].path
      );
    }
    if (req.files?.certificate) {
      updateData.photographs.certificateURL = await uploadToCloudinary(
        req.files.certificate[0].path
      );
    }
    
    const updatedAchievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAchievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    res.json(updatedAchievement);
  } catch (err) {
    console.error("Error updating achievement:", err);
    res.status(500).json({ error: err.message });
  }
};



const deleteAchievement = async(req, res) => {
    try {
    const deleted = await Achievement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Achievement not found" });
    }
    res.json({ message: "Achievement successfully deleted" });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = { createAchievement , getAchievementByStu , updateAchievement , deleteAchievement };