const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    stuID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    type: {
      type: String,
      enum: ["Committee"], // Only Committee allowed
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    certificateURL: {
      url: { type: String }, // Cloudinary secure URL
      publicId: { type: String }, // Cloudinary public_id for deletion
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
