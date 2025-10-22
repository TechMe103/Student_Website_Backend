const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/VerifyToken");

const {
  addSemInfo,
  updateSemInfo,
  deleteSemInfo,
  getAllSemInfos,
  getOwnSemInfos,
  getStudentSemInfosByAdmin
} = require("../controllers/semInfoController");

// Admin routes 
router.get("/all", verifyToken, getAllSemInfos);
router.get("/student/:studentId", verifyToken, getStudentSemInfosByAdmin);

// Student routes
router.get("/", verifyToken, getOwnSemInfos);
router.post("/", verifyToken, addSemInfo);
router.put("/:id", verifyToken, updateSemInfo);
router.delete("/:id", verifyToken, deleteSemInfo);

module.exports = router;
