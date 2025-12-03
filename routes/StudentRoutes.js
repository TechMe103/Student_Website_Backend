const express = require('express');
const router = express.Router();
const {addStudentDetails, getStudentById, getStudents, getSingleStudent, updateStudent, deleteStudent, importExcelDataWithPasswords, exportAllStudentsToExcel } = require("../controllers/StudentController");
const uploadExcel = require("../middlewares/excelMulter");
const verifyToken =require ("../middlewares/VerifyToken");
const upload = require("../middlewares/multer");
const trimRequestBodyStrings= require("../middlewares/trimRequestBodyStrings");

const authenticateToken= require("../middlewares/authenticateToken");
const authorizeRoles=require("../middlewares/authorizeRoles");


const uploadMemoryStorage=require("../middlewares/multerImportExcel");

// route to add excel file and then send generated passwords via email --admin access
router.post('/import', authenticateToken, authorizeRoles("admin"), uploadMemoryStorage.single("studentData"), importExcelDataWithPasswords );

// route to dwnload all student data in Excel format
router.get("/export-students", authenticateToken, authorizeRoles("admin"), exportAllStudentsToExcel);

// route to add remaining details --student
router.post('/',    
    authenticateToken , 
    authorizeRoles("admin", "student"),
    upload.fields([{ name: "studentPhoto", maxCount: 1 }]),
    trimRequestBodyStrings,
    addStudentDetails 
);

//route to update remaining details --student & admin
router.put("/:studentId",
    authenticateToken , 
    authorizeRoles("admin", "student"),
    upload.fields([{ name: "studentPhoto", maxCount: 1 }]),
    trimRequestBodyStrings,
    updateStudent
);

// route to delete student --student & admin
router.delete("/:studentId", authenticateToken, authorizeRoles("admin", "student"), deleteStudent);

// GET routes
router.get("/", authenticateToken, authorizeRoles("admin"), getStudents);  // Admin onnly --with search, filter and pagination
router.get("/me", authenticateToken, authorizeRoles("student"), getStudentById); // Student self
router.get("/:studentId", authenticateToken, authorizeRoles("admin"), getSingleStudent); // Admin only


module.exports = router;
