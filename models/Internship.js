const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema({
    stuID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    companyName: { type: String, required: true },

    role: { type: String, required: true },

    startDate: { type: Date, required: true },

    endDate: { type: Date, required: true },

    durationMonths: {
        type: Number,
        min: 1,
        max: 6,
        required: true
    },

    stipendInfo: {
        isPaid: { type: Boolean, required: true },
        stipend: {
            type: Number,
            required: function () {
                return this.stipendInfo?.isPaid === true;
            }
        }
    },

    description: { type: String, required: true },

    // Certificates, photographs, and report (pdf)
    internshipReport: {
        url: { type: String },          // Cloudinary secure URL
        publicId: { type: String },     // Cloudinary public_id for deletion
    },

    photoProof: {
        url: { type: String },          // Cloudinary secure URL
        publicId: { type: String },     // Cloudinary public_id for deletion
    }

}, { timestamps: true });

module.exports = mongoose.model("Internship", internshipSchema);
