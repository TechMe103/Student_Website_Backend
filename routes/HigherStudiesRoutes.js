const express = require("express");
const router = express.Router();
const {
    createHigherStudy,
    updateHigherStudy,
    deleteHigherStudy,
    getAllHigherStudies,
    getHigherStudiesByStudent,
    getOwnHigherStudies,
} = require("../controllers/HigherStudiesController");

const verifyToken =require ("../middlewares/VerifyToken");

const upload=require("../middlewares/multer");


// ------------------- ROUTES ------------------- //

// Create Higher Study (Student only)
router.post("/", verifyToken, upload.single("marksheet"), createHigherStudy);

// Update Higher Study (Student/Admin)
router.put("/:higherStudyId", verifyToken, upload.single("marksheet"), updateHigherStudy);

// Delete Higher Study (Student/Admin)
router.delete("/:higherStudyId", verifyToken, deleteHigherStudy);

// Get own Higher Studies (Student only)
router.get("/", verifyToken, getOwnHigherStudies);

// Get all Higher Studies (Admin only)
router.get("/all", verifyToken, getAllHigherStudies);

// Get Higher Studies by Student ID
router.get("/:studentId", verifyToken, getHigherStudiesByStudent);

module.exports = router;
