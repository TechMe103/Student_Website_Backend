const express = require("express");
const router = express.Router();
const { createPlacement, updatePlacement, deletePlacement, getPlacements, getOwnPlacements, getStudentPlacementsByAdmin, getSinglePlacement, } = require("../controllers/PlacementController");

const verifyToken =require ("../middlewares/VerifyToken");

const upload=require("../middlewares/multer");



// --------------------------- ROUTES --------------------------- //

// Create Placement (Student only)
router.post("/",
    verifyToken,
    upload.fields([{ name: "placementProof", maxCount: 1 }]),
    createPlacement
);

// Update Placement (Admin or Student)
router.put(
    "/:placementId",
    verifyToken,
    upload.fields([{ name: "placementProof", maxCount: 1 }]),
    updatePlacement
);

// Delete Placement (Admin or Student)
router.delete("/:placementId", verifyToken, deletePlacement);

// Get Logged-in Student’s Own Placements
router.get("/me", verifyToken, getOwnPlacements);

// Get All Placements (Admin only)
router.get("/", verifyToken, getPlacements);

// Get Placements of Specific Student (Admin)
router.get("/student-placement-by-admin/:studentId", verifyToken, getStudentPlacementsByAdmin);

// Get Single Placement by ID
router.get("/:placementId", verifyToken, getSinglePlacement);

// --------------------------- EXPORT --------------------------- //
module.exports = router;
