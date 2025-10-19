const express = require("express");
const router = express.Router();

const { createInternship , getInternshipByStu , updateInternship , deleteInternship } = require("../controllers/internController");

const verifyToken =require ("../middlewares/VerifyToken");


//route => internship
router.post("/" , verifyToken , createInternship);

//get internship => student
router.get("/:stuID" , getInternshipByStu);

//update internship
router.put("/:id" , updateInternship);


//del internship
router.delete("/:id" , deleteInternship);

module.exports = router;
