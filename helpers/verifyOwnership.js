const mongoose = require("mongoose");

/**
 * Checks whether the logged-in student owns the given resource.
 *
 * @param {String} loggedInStudentId - The ID of the currently logged-in student (req.user.id)
 * @param {String} resourceId - The _id of the resource to check ownership for
 * @param {Object} Model - The Mongoose model (e.g. Internship, Placement, HigherStudies)
 * @throws {Error} - Throws descriptive error if invalid ID, not found, or unauthorized
 */
const verifyStudentOwnership = async (loggedInStudentId, resourceId, Model) => {
    try {

        // Find resource in the database
        const resource = await Model.findById(resourceId);
        if (!resource) {
            throw new Error("Resource not found");
        }

        // Check ownership (studentId field)
        if (resource.stuID.toString() === loggedInStudentId.toString()) {
            return true;
        }

        // If everything passes, return true
        throw new Error("Unauthorized access: You do not own this resource");
    } catch (err) {
        console.error("Error verifying student ownership:", err.message);
        throw err; // Re-throw the same error to be handled in controller
    }
};

module.exports = verifyStudentOwnership;
