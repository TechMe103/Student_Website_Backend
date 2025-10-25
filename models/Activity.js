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
      enum: ["Committee", "Sports", "Hackathon"],
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
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
