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

// Create Achievement (accept 2 files)
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
  createAchievement
);

router.get("/", verifyToken, getOwnAchievements);


// Update achievement (accept new files)
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
  updateAchievement
);

// Delete achievement
router.delete("/:id", verifyToken, deleteAchievement);

// Get all achievements (admin)
router.get("/all", verifyToken, getAllAchievements);
router.get("/student/:studentId", verifyToken, getStudentAchievementsByAdmin);

module.exports = router;



