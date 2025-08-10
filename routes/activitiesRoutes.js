const express = require("express");
const router = express.Router();

const { createActivity , getActivityByStu , updateActivity , deleteActivity } = require("../controllers/activitiesContro");

router.post("/" , createActivity);
router.get("/:stuID" , getActivityByStu);
router.put("/:id" , updateActivity);
router.delete("/:id" , deleteActivity);

module.exports = router;