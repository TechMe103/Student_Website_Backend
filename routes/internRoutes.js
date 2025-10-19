const express = require("express");
const router = express.Router();

const { createInternship , getAllInternships, getOwnInternships , updateInternship , deleteInternship } = require("../controllers/internController");

const verifyToken =require ("../middlewares/VerifyToken");

const upload=require("../middlewares/multer");


//route => internship
router.post("/" , 
    verifyToken , 
    upload.fields([
        { name: "internshipReport", maxCount: 1 },
        { name: "photoProof", maxCount: 1 },
    ]), 
    createInternship);

//get all internships 
router.get("/all" , verifyToken, getAllInternships);

// get all internships of a student
router.get("/",verifyToken, getOwnInternships )

//update internship
router.put("/:id" ,verifyToken, updateInternship);


//del internship
router.delete("/:internshipId" ,verifyToken, deleteInternship);

module.exports = router;
