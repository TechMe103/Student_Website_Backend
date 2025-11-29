const fs = require("fs").promises;
const { uploadToCloudinary } = require("./UploadToCloudinary");
const { deleteMultipleFromCloudinary } = require("./DeleteMultipleFromCloudinary");

/**
 * Validate and upload multiple files atomically to Cloudinary
 * @param {Object} filesObj - object containing file arrays (e.g., req.files)
 * @param {Array} fileConfigs - array of objects defining { fieldName, allowedTypes, maxSize, friendlyName }
 * @returns {Object} - object containing uploaded files { fieldName: { url, publicId } }
 * @throws - if validation fails or upload fails (atomic rollback)
 */
const validateAndUploadFiles = async (filesObj, fileConfigs) => {
    const uploadedFiles = {};
    const uploadedPublicIds = [];

    try {
        for (let config of fileConfigs) {
            const { fieldName, allowedTypes, maxSize, friendlyName } = config;

            const file = filesObj?.[fieldName]?.[0];
            if (!file) throw new Error(`${friendlyName} is required`);

            if (!allowedTypes.includes(file.mimetype)) {
                throw new Error(`${friendlyName} must be of type: ${allowedTypes.join(", ")}`);
            }

            if (file.size > maxSize) {
                throw new Error(`${friendlyName} exceeds ${maxSize / (1024 * 1024)}MB`);
            }

            // Upload file
            const result = await uploadToCloudinary(file.path);
            uploadedFiles[fieldName] = { url: result.url, publicId: result.publicId };
            uploadedPublicIds.push(result.publicId);
        }

        return uploadedFiles;

    } catch (err) {
        // Rollback all successfully uploaded files in case of error
        await deleteMultipleFromCloudinary(uploadedPublicIds);
        throw err;
    }
};

module.exports = { validateAndUploadFiles, deleteMultipleFromCloudinary };
