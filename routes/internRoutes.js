const express = require("express");
const router = express.Router();

const { createInternship , getInternships, getOwnInternships , updateInternship , deleteInternship, getStudentInternshipsByAdmin, getSingleInternship } = require("../controllers/internController");

const verifyToken =require ("../middlewares/VerifyToken");

const upload=require("../middlewares/multer");

const authenticateToken= require("../middlewares/authenticateToken");
const authorizeRoles=require("../middlewares/authorizeRoles");

// create internship
router.post("/" , 
    authenticateToken , 
    authorizeRoles("admin", "student"),
    upload.fields([
        { name: "internshipReport", maxCount: 1 },
        { name: "photoProof", maxCount: 1 },
    ]), 
    createInternship
);

//get all internships --admin
router.get("/" , authenticateToken, authorizeRoles("admin"), getInternships);

// get all internships of a student --student
router.get("/me",authenticateToken, authorizeRoles("student"), getOwnInternships );

// get all internships of a student --admin
router.get("/student-internship-by-admin/:studentId", authenticateToken, authorizeRoles("admin"), getStudentInternshipsByAdmin);

//can be used by both admin or student
router.get("/:internshipId", authenticateToken, authorizeRoles("admin", "student"), getSingleInternship);

//update internship
router.put("/:internshipId" ,
    authenticateToken, 
    authorizeRoles("admin", "student"),
    upload.fields([
        { name: "photoProof" }, 
        { name: "internshipReport" }
    ]),
    updateInternship
);


//del internship --admin and student
router.delete("/:internshipId" , authenticateToken, authorizeRoles("admin", "student"), deleteInternship);

module.exports = router;
