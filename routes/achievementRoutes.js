const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer");

const { createAchievement , getAchievementByStu , updateAchievement , deleteAchievement } = require("../controllers/achievementController");


//accept 2 files
router.post("/" , 
    upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
  createAchievement);

router.get("/:stuID" , getAchievementByStu);

router.put("/:id" ,
    upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
   updateAchievement);


router.delete("/:id" , deleteAchievement);

module.exports = router;