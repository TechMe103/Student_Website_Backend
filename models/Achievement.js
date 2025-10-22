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
      enum: ["Coding competitions", "Committee", "Hackathons", "Sports", "Cultural", "Technical"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    issuedBy: { type: String, required: true },
    date: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    achievementType: {
      type: String,
      enum: ["Participation", "Winner", "Runner-up"],
      required: true,
    },
    teamMembers: { type: [String], default: [] },
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
  { timestamps: true } // adds createdAt & updatedAt
);

module.exports = mongoose.model("Achievement", achievementSchema);
