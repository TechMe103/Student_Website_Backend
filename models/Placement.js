const { required } = require("joi");
const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema({
	stuID: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Student",
		required: true,
	},

	companyName: {
		type: String,
		required: true,
	},

	role: {
		type: String,
		required: true,
	},

	placementType: {
		type: String,
		enum: ["Campus", "Off-Campus"],
		required: true,
	},

	placementProof: {
		url: { type: String, required : true },      // Cloudinary secure URL
		publicId: { type: String, required : true }, // Cloudinary public_id for deletion
	},
},
{ timestamps: true });

module.exports = mongoose.model("Placement", placementSchema);
