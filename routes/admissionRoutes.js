const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/VerifyToken");
const {
  createAdmission,
  getAdmissionsByStudent,
  updateAdmission,
  deleteAdmission,
  getAllAdmissions,
  updateAdmissionStatus,
  getUnpaidStudents,
} = require("../controllers/admissionController");

// Student routes
router.post("/create", verifyToken, createAdmission);
router.get("/my-admissions", verifyToken, getAdmissionsByStudent);
router.put("/update/:id", verifyToken, updateAdmission);
router.delete("/delete/:id", verifyToken, deleteAdmission);

// Admin routes
router.get("/all", verifyToken, getAllAdmissions);
router.put("/status/:id", verifyToken, updateAdmissionStatus);
router.get("/unpaid", verifyToken, getUnpaidStudents);

module.exports = router;
