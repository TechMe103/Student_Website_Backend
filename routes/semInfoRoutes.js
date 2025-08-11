const express = require("express");
const router = express.Router();

const { addSemInfo , getSemInfoByStu , updateSemInfo } = require("../controllers/semInfoController");

router.post("/" , addSemInfo);
router.get("/:stuID" , getSemInfoByStu);
router.put("/:id" , updateSemInfo);

module.exports = router;