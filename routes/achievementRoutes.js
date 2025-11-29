const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer");
const verifyToken = require("../middlewares/VerifyToken");

const {
  createAchievement,
  getOwnAchievements,
  getAllAchievements,
  getStudentAchievementsByAdmin,
  updateAchievement,
  deleteAchievement,
} = require("../controllers/achievementController");

//Create Achievement (accept 3–4 files)
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
    { name: "course_certificate", maxCount: 1 }, // new field
  ]),
  createAchievement
);

//Get achievements of logged-in student
router.get("/", verifyToken, getOwnAchievements);

// Update Achievement (allow replacing any uploaded file)
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
    { name: "course_certificate", maxCount: 1 },
  ]),
  updateAchievement
);

//Delete an achievement
router.delete("/:id", verifyToken, deleteAchievement);

//Admin: Get all achievements (with filtering options)
router.get("/all", verifyToken, getAllAchievements);

//Admin: Get specific student's achievements
router.get("/student/:studentId", verifyToken, getStudentAchievementsByAdmin);

module.exports = router;
