const dotenv=require("dotenv");
const fs= require("fs");

dotenv.config();

const upload=require("../middlewares/multer.js");

const cloudinary=require("../config/cloudinaryConfig.js");



const uploadToCloudinary = async (localFilePath) =>{
    try {
        const result = await cloudinary.uploader.upload(localFilePath, {
            folder : "studentWebsite",
        });

        return result.secure_url;

    } catch (error) {
       
       console.error( "Failed to upload file to cloudinary: " ,error);
       throw error;
    } finally{
        try {
            await fs.unlink(localFilePath); // attempt cleanup even on error
        } catch (err) {
            console.error("Failed to delete temp file:", err);
        }
    }
}

module.exports = {uploadToCloudinary};