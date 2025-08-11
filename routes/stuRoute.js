const express = require("express");
const router = express.Router();
const { registerStu , getStuId } = require("../controllers/stuController");

router.post("/register" , registerStu);
router.get("/:id" , getStuId);

module.exports = router;