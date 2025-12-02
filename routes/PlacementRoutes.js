const express = require("express");
const router = express.Router();
const { createPlacement, updatePlacement, deletePlacement, getPlacements, getOwnPlacements, getStudentPlacementsByAdmin, getSinglePlacement, } = require("../controllers/PlacementController");

const verifyToken =require ("../middlewares/VerifyToken");

const upload=require("../middlewares/multer");


const authenticateToken= require("../middlewares/authenticateToken");
const authorizeRoles=require("../middlewares/authorizeRoles");
const trimRequestBodyStrings=require("../middlewares/trimRequestBodyStrings");


// Create Placement (Student or Admin)
router.post("/",
    authenticateToken , 
    authorizeRoles("admin", "student"),
    upload.fields([{ name: "placementProof", maxCount: 1 }]),
    trimRequestBodyStrings,
    createPlacement
);

// Update Placement (Admin or Student)
router.put(
    "/:placementId",
    authenticateToken , 
    authorizeRoles("admin", "student"),
    upload.fields([{ name: "placementProof", maxCount: 1 }]),
    trimRequestBodyStrings,
    updatePlacement
);

// Delete Placement (Admin or Student)
router.delete("/:placementId", authenticateToken , authorizeRoles("admin", "student"), trimRequestBodyStrings, deletePlacement);

// Get Logged-in Student’s Own Placements --student only
router.get("/me", authenticateToken , authorizeRoles("student"), trimRequestBodyStrings, getOwnPlacements);

// Get All Placements (Admin only)
router.get("/", authenticateToken , authorizeRoles("admin"), trimRequestBodyStrings, getPlacements);

// Get Placements of Specific Student (Admin)
router.get("/student-placement-by-admin/:studentId", authenticateToken , authorizeRoles("admin"), trimRequestBodyStrings, getStudentPlacementsByAdmin);

// Get Single Placement by ID
router.get("/:placementId", authenticateToken , authorizeRoles("admin", "student"), trimRequestBodyStrings, getSinglePlacement);


module.exports = router;
