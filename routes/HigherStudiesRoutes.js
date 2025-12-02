// const express = require("express");
// const router = express.Router();
// const {
//     createHigherStudy,
//     updateHigherStudy,
//     deleteHigherStudy,
//     getHigherStudies,
//     getHigherStudiesByStudent,
//     getOwnHigherStudies,
// } = require("../controllers/HigherStudiesController");

// const verifyToken =require ("../middlewares/VerifyToken");

// const upload=require("../middlewares/multer");


// // ------------------- ROUTES ------------------- //

// // Create Higher Study (Student only)
// router.post("/", verifyToken, upload.single("marksheet"), createHigherStudy);

// // Update Higher Study (Student/Admin)
// router.put("/:higherStudyId", verifyToken, upload.single("marksheet"), updateHigherStudy);

// // Delete Higher Study (Student/Admin)
// router.delete("/:higherStudyId", verifyToken, deleteHigherStudy);

// // Get own Higher Studies (Student only)
// router.get("/me", verifyToken, getOwnHigherStudies);

// // Get all Higher Studies (Admin only)
// router.get("/", verifyToken, getHigherStudies);

// // Get Higher Studies by Student ID (Admin )
// router.get("/:studentId", verifyToken, getHigherStudiesByStudent);

// module.exports = router;

const express = require("express");
const router = express.Router();
const {
    createHigherStudy,
    updateHigherStudy,
    deleteHigherStudy,
    getHigherStudies,
    getHigherStudiesByStudent,
    getOwnHigherStudies,
    getSingleHigherStudy,
} = require("../controllers/HigherStudiesController");

const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");
const trimRequestBodyStrings = require("../middlewares/trimRequestBodyStrings");
const upload = require("../middlewares/multer");


// Create Higher Study (Student or Admin)
router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "student"),
    upload.fields([{ name: "marksheet", maxCount: 1 }, { name: "idCardPhoto", maxCount: 1 }]),
    trimRequestBodyStrings,
    createHigherStudy
);

// Update Higher Study (Student or Admin)
router.put(
    "/:higherStudyId",
    authenticateToken,
    authorizeRoles("admin", "student"),
    upload.fields([{ name: "marksheet", maxCount: 1 }, { name: "idCardPhoto", maxCount: 1 }]),
    trimRequestBodyStrings,
    updateHigherStudy
);

// Delete Higher Study (Student or Admin)
router.delete("/:higherStudyId", authenticateToken, authorizeRoles("admin", "student"), trimRequestBodyStrings, deleteHigherStudy );

// Get Logged-in Student’s Own Higher Studies --student only
router.get( "/me", authenticateToken, authorizeRoles("student"), trimRequestBodyStrings, getOwnHigherStudies );

// Get All Higher Studies (Admin only)
router.get( "/", authenticateToken, authorizeRoles("admin"), trimRequestBodyStrings, getHigherStudies );


// Get Higher Studies of Specific Student (Admin or student)
router.get("/:studentId", authenticateToken, authorizeRoles("admin"), trimRequestBodyStrings, getHigherStudiesByStudent );

module.exports = router;

