const express = require("express");
const router = express.Router();

const { createAchievement , getAchievementByStu , updateAchievement , deleteAchievement } = require("../controllers/achievementContro");

router.post("/" , createAchievement);
router.get("/:stuID" , getAchievementByStu);
router.put("/:id" , updateAchievement);
router.delete("/:id" , deleteAchievement);

module.exports = router;