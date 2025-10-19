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
        fs.unlink(localFilePath, (err) => {
            if (err) {
                console.error("Failed to delete temp file:", err);
            } else {
                console.log("Temp file deleted:", localFilePath);
            }
        });
    }
}

module.exports = {uploadToCloudinary};