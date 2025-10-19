const mongoose = require("mongoose");

const higherStudiesSchema = new mongoose.Schema({
  stuID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },

  examName: {
    type: String,
    enum: ["GATE", "CAT", "GRE", "TOFEL", "IELTS", "UPSC"],
    required: true,
  },

  score: {
    type: Number,
    required: true,
  },

  marksheet: {
    url: { type: String },      // Cloudinary secure URL
    publicId: { type: String }, // Cloudinary public_id for deletion
  },
},
{ timestamps: true });

module.exports = mongoose.model("HigherStudies", higherStudiesSchema);
