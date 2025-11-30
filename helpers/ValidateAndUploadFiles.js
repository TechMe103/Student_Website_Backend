const fs = require("fs").promises;
const cloudinary = require("../config/cloudinaryConfig");
const { deleteMultipleFromCloudinary } = require("./DeleteMultipleFromCloudinary");



const validateAndUploadFiles = async (filesObj, fileConfigs) => {
    const uploadedFiles = {};
    const uploadedPublicIds = [];

    console.log(filesObj);

    try {
        //  VALIDATION 
        for (let config of fileConfigs) {
        const { fieldName, allowedTypes, maxSize, friendlyName } = config;

        const file = filesObj?.[fieldName]?.[0];
        if (!file) throw new Error(`${friendlyName} is required`);

        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(
            `${friendlyName} must be one of: ${allowedTypes.join(", ")}`
            );
        }

        if (file.size > maxSize) {
            throw new Error(
            `${friendlyName} exceeds ${maxSize / (1024 * 1024)}MB`
            );
        }
        }

        //  PARALLEL UPLOAD 
        const uploadPromises = fileConfigs.map(async (config) => {
            const { fieldName } = config;
            const file = filesObj?.[fieldName]?.[0];

            try {
                const result = await cloudinary.uploader.upload(file.path, {
                folder: "studentWebsite",
                });

                uploadedFiles[fieldName] = {
                url: result.secure_url,
                publicId: result.public_id,
                };

                uploadedPublicIds.push(result.public_id);

                // delete temp file
                await fs.unlink(file.path).catch(() => {});

            } catch (err) {
                throw new Error(`Failed to upload ${fieldName}`);
            }
        });

        await Promise.all(uploadPromises);

        return uploadedFiles;

    } catch (err) {
            //  ROLLBACK 
            await deleteMultipleFromCloudinary(uploadedPublicIds);
            throw err;
    }
};

module.exports = { validateAndUploadFiles };
