const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/VerifyToken");
const upload = require("../middlewares/multer");

const { createActivity , getActivityByStu , getActivitiesByStudentAdmin , updateActivity , deleteActivity , getAllActivities } = require("../controllers/activitiesController");

//Student Routes
router.post("/", verifyToken, upload.single("certificate"), createActivity);
router.get("/", verifyToken, getActivityByStu);
router.put("/:id", verifyToken, updateActivity);
router.delete("/:id", verifyToken, deleteActivity);

// Admin Routes
router.get("/all", verifyToken, getAllActivities);
router.get("/student/:studentId", verifyToken, getActivitiesByStudentAdmin);

module.exports = router;