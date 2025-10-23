const dotenv=require("dotenv");
const fs = require("fs").promises;

dotenv.config();

const upload=require("../middlewares/multer.js");

const cloudinary=require("../config/cloudinaryConfig.js");




const deleteFromCloudinary = async (publicId) => {
	if (!publicId) return;

	try {
		const result = await cloudinary.uploader.destroy(publicId);

		if (result.result === "ok" || result.result === "not found") {
			console.log(`✅ Cloudinary deletion successful: ${publicId}`);
		} else {
			console.error(`⚠️ Cloudinary deletion issue for ${publicId}:`, result);
			throw new Error(`Cloudinary deletion failed for ${publicId}`);
		}
	} catch (err) {
		console.error("❌ Cloudinary deletion error:", err);
		throw err;
	}
};


module.exports = {deleteFromCloudinary};