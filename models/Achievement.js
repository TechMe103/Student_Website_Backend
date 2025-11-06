const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    stuID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Coding competitions",
        "Committee",
        "Hackathons",
        "Sports",
        "Cultural",
        "Technical",
        "Other",
      ],
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

    issuedBy: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },

    achievementType: {
      type: String,
      enum: ["Participation", "Winner", "Runner-up"],
      required: true,
    },

    teamMembers: {
      type: [String],
      default: [],
    },

    // Certification Course (new field)
    certification_course: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // Course certificate upload (new field)
    course_certificate: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    //event photos
    photographs: {
      eventPhoto: {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
      certificate: {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Achievement", achievementSchema);
