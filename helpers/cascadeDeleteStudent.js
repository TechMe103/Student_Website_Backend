const { cloudinary } = require("../config/cloudinaryConfig");
const Internship = require("../models/Internship");
const Placement = require("../models/Placement");
const HigherStudies = require("../models/HigherStudies");
const { deleteFromCloudinary } = require("./DeleteFromCloudinary");

// Main cascade delete utility
const cascadeDeleteStudent = async (studentId) => {
	const relatedModels = [
		{ model: Internship, fields: ["internshipReport.publicId", "photoProof.publicId"] },
		{ model: Placement, fields: ["placementProof.publicId"] },
		{ model: HigherStudies, fields: ["marksheet.publicId"] },
	];

	for (const { model, fields } of relatedModels) {
		const docs = await model.find({ stuID: studentId });

		for (const doc of docs) {
			// Delete all Cloudinary files for each document
			for (const fieldPath of fields) {
				const publicId = fieldPath.split(".").reduce((obj, key) => obj?.[key], doc);
				if (publicId) await deleteFromCloudinary(publicId);
			}

			// Delete the document itself
			await model.findByIdAndDelete(doc._id);
		}
	}
};

module.exports = cascadeDeleteStudent;
