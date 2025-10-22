const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/VerifyToken"); // verifies token & sets req.user
const isAdmin = require("../middlewares/isAdmin"); // ensures admin access

const { createAdmission, getAdmissionsByStudent, updateAdmission, deleteAdmission, getAllAdmissions, updateAdmissionStatus, getUnpaidStudents } = require("../controllers/admissionController");


//STUDENT ROUTES
router.post("/create", verifyToken, createAdmission); // student creates admission
router.get("/my-admissions", verifyToken, getAdmissionsByStudent); // view own admissions
router.put("/update/:id", verifyToken, updateAdmission); // update pending admission
router.delete("/delete/:id", verifyToken, deleteAdmission); // delete pending admission


//ADMIN ROUTES
router.get("/all", verifyToken, isAdmin, getAllAdmissions); // admin view all admissions
router.put("/status/:id", verifyToken, isAdmin, updateAdmissionStatus); // approve/reject
router.get("/unpaid", verifyToken, isAdmin, getUnpaidStudents); // unpaid students list


module.exports = router;
