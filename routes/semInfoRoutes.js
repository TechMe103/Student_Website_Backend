const express = require("express");
const router = express.Router();

const { addSemInfo , getSemInfoByStu , updateSemInfo , deleteSemInfo } = require("../controllers/semInfoController");

router.post("/" , addSemInfo);
router.get("/:stuID" , getSemInfoByStu);
router.put("/:id" , updateSemInfo);
router.delete("/:id", deleteSemInfo);

module.exports = router;