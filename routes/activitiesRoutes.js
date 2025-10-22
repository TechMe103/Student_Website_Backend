const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/VerifyToken");
const upload = require("../middlewares/multer");

const { createActivity , getActivityByStu , updateActivity , deleteActivity ,getAllActivities } = require("../controllers/activitiesController");

router.post("/" ,verifyToken, upload.single("certificate"), createActivity);
router.get("/:stuID" ,verifyToken, getActivityByStu);
router.put("/:id" ,verifyToken, updateActivity);
router.delete("/:id" ,verifyToken, deleteActivity);
router.get("/", verifyToken, getAllActivities);

module.exports = router;