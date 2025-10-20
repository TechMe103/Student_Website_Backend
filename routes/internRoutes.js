const express = require("express");
const router = express.Router();

const { createInternship , getAllInternships, getOwnInternships , updateInternship , deleteInternship, getStudentInternshipsByAdmin, getSingleInternship } = require("../controllers/internController");

const verifyToken =require ("../middlewares/VerifyToken");

const upload=require("../middlewares/multer");


//route => internship
router.post("/" , 
    verifyToken , 
    upload.fields([
        { name: "internshipReport", maxCount: 1 },
        { name: "photoProof", maxCount: 1 },
    ]), 
    createInternship
);

//get all internships --admin
router.get("/all" , verifyToken, getAllInternships);

// get all internships of a student --student
router.get("/",verifyToken, getOwnInternships );

// get all internships of a student --admin
router.get("/student-internship-by-admin/:studentId", verifyToken, getStudentInternshipsByAdmin);

//can be used by both admin or student
router.get("/:internshipId", verifyToken, getSingleInternship);

//update internship
router.put("/:internshipId" ,
    verifyToken, 
    upload.fields([
        { name: "photoProof" }, 
        { name: "internshipReport" }
    ]),
    updateInternship
);


//del internship
router.delete("/:internshipId" ,verifyToken, deleteInternship);

module.exports = router;
