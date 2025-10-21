const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require("../middlewares/multer");

// router.post('/signup', upload.single("studentPhoto") ,authController.signup);
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);
router.get('/logout', authController.logout);


module.exports = router;
