const express = require('express');
const router = express.Router();
const {addStudentDetails, getStudentById, getStudents, getAllStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords } = require("../controllers/StudentController");
const uploadExcel = require("../middlewares/excelMulter");
const verifyToken =require ("../middlewares/VerifyToken");
const upload = require("../middlewares/multer");
const trimRequestBodyStrings= require("../middlewares/trimRequestBodyStrings");


// route to add excel file and then send generated passwords via email --admin access
router.post('/import', verifyToken ,uploadExcel.single("studentData"), importExcelDataWithPasswords );

// route to add remaining details --student
router.post('/', verifyToken ,upload.single("studentPhoto"), trimRequestBodyStrings, addStudentDetails );

//route to update remaining details --student & admin
router.put("/:studentId", verifyToken, upload.single("studentPhoto"), trimRequestBodyStrings, updateStudent);

// route to delete student --student & admin
router.delete("/:studentId", verifyToken, deleteStudent);

// GET routes
router.get("/", verifyToken, getStudents);              // optional basic search/pagination
router.get("/all", verifyToken, getAllStudents);       // Admin only
router.get("/me", verifyToken, getStudentById);        // Student self
router.get("/:studentId", verifyToken, getSingleStudent); // Admin only


module.exports = router;
