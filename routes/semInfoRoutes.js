const express = require("express");
const router = require.Router();

const { addSemInfo , getSemInfoByStu , updateSemInfo } = require("../controllers/semInfoContro");

router.post("/" , addSemInfo);
router.get("/:stuID" , getSemInfoByStu);
router.put("/:id" , updateSemInfo);

module.exports = router;