const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer");
const verifyToken = require("../middlewares/VerifyToken");

const { createAchievement , getAchievementByStu , updateAchievement , deleteAchievement } = require("../controllers/achievementController");


//accept 2 files
router.post("/" , verifyToken , 
    upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
  createAchievement);

router.get("/:stuID" , verifyToken , getAchievementByStu);

router.put("/:id" , verifyToken , 
    upload.fields([
    { name: "eventPhoto", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
   updateAchievement);


router.delete("/:id" ,verifyToken , deleteAchievement);

module.exports = router;


