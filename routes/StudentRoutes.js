const express = require('express');
const router = express.Router();
const { getAllStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords } = require("../controllers/StudentController");
const uploadExcel = require("../middlewares/excelMulter");
const verifyToken =require ("../middlewares/VerifyToken");


// route to add excel file and then send generated passwords via email --admin access
router.post('/import', verifyToken ,uploadExcel.single("studentData"), importExcelDataWithPasswords );


module.exports = router;
