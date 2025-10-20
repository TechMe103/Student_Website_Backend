const express = require("express");
const router = express.Router();
const {
    createPersonalDetail,
    updatePersonalDetail,
    deletePersonalDetail,
    getPersonalDetailByStudent,
    getOwnPersonalDetail,
} = require("../controllers/PersonalDetailController");

const verifyToken =require ("../middlewares/VerifyToken");

// CREATE PERSONAL DETAIL --Student only
router.post("/", verifyToken, createPersonalDetail);

// UPDATE PERSONAL DETAIL --Student or Admin
router.put("/:personalDetailId", verifyToken, updatePersonalDetail);

// DELETE PERSONAL DETAIL --Student or Admin
router.delete("/:personalDetailId", verifyToken, deletePersonalDetail);


// GET PERSONAL DETAIL BY STUDENT ID --Admin only
router.get("/:studentId", verifyToken, getPersonalDetailByStudent);

// GET OWN PERSONAL DETAIL --Student only
router.get("/", verifyToken, getOwnPersonalDetail);

module.exports = router;
