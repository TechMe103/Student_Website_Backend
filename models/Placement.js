// const { required } = require("joi");
// const mongoose = require("mongoose");

// const placementSchema = new mongoose.Schema({
// 	stuID: {
// 		type: mongoose.Schema.Types.ObjectId,
// 		ref: "Student",
// 		required: true,
// 	},

// 	companyName: {
// 		type: String,
// 		required: true,
// 	},

// 	role: {
// 		type: String,
// 		required: true,
// 	},

// 	placementType: {
// 		type: String,
// 		enum: ["Campus", "Off-Campus"],
// 		required: true,
// 	},

// 	//LOI or offer letter or joining letter --pdf
// 	placementProof: {
// 		url: { type: String, required : true },      // Cloudinary secure URL
// 		publicId: { type: String, required : true }, // Cloudinary public_id for deletion
// 	},
// },
// { timestamps: true });

// module.exports = mongoose.model("Placement", placementSchema);




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

	// NEW FIELDS (as per HOD requirement)
	// package in lpa
	package: {
		type: Number,
		required: true,
		min: 0.5,
		max: 100,
	},

	placementYear: {
		type: String,
		required: true,
	},

	passoutYear: {
		type: String,
		required: true,
	},

	joiningYear: {
		type: String,
		required: true,
	},

	// LOI / Offer letter / Joining letter (PDF)
	placementProof: {
		url: { type: String, required: true },
		publicId: { type: String, required: true },
	},

}, { timestamps: true });

module.exports = mongoose.model("Placement", placementSchema);
