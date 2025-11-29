// helpers/fileHandler.js
const cloudinary = require("../config/cloudinaryConfig");

/**
 * Bulk delete multiple Cloudinary files (production-level)
 * @param {Array<string>} publicIds - Cloudinary public IDs
 * @returns {Object} { deleted: [], failed: [] }
 */
const deleteMultipleFromCloudinary = async (publicIds = []) => {
    // Filter out invalid IDs
    const validPublicIds = publicIds.filter(id => typeof id === "string" && id.trim() !== "");

    if (validPublicIds.length === 0) {
        return { deleted: [], failed: [] };
    }

    try {
        const result = await cloudinary.api.delete_resources(validPublicIds);

        const deleted = [];
        const failed = [];

        // Cloudinary returns result.resources object
        for (let id of validPublicIds) {
            const status = result.deleted[id];

            if (status === "deleted") {
                deleted.push(id);
            } else {
                failed.push({ publicId: id, reason: status || "Unknown error" });
            }
        }

        return { deleted, failed };

    } catch (err) {
        console.error("Cloudinary bulk deletion error:", err);
        // If the whole bulk request fails, mark all as failed
        return {
            deleted: [],
            failed: validPublicIds.map(id => ({ publicId: id, reason: err.message }))
        };
    }
};

module.exports = { deleteMultipleFromCloudinary };
