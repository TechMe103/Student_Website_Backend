const mongoose = require("mongoose");

const markSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    score: { type: Number, min: 0, required: true },
    outOf: { type: Number, min: 1, required: true }
});

const semesterInfoSchema = new mongoose.Schema({

    stuID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
},

    semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },

    attendance: { type: Number, min: 0, max: 100, required: true },
    kts: { type: [String], default: [] },
    marks: { type: [markSchema], required: true },
    isDefaulter: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("SemesterInfo", semesterInfoSchema);
