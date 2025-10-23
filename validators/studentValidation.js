const Joi = require("joi");

const importExcelSchema = Joi.object({
    studentID: Joi.string().pattern(/^[0-9]{4}[A-Z]{4}[0-9]{3}$/),
    email : Joi.string().email(),
});

const addStudentDetailsSchema = Joi.object({
    firstName: Joi.string().pattern(/^[A-Za-z]+$/).required(),
    middleName: Joi.string().pattern(/^[A-Za-z]+$/).required(),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/).required(),
    motherName: Joi.string().pattern(/^[A-Za-z]+$/).required(),

    PRN: Joi.string().pattern(/^[1-9]\d{14}$/).required(),
    branch: Joi.string().valid("Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical").required(),
    year: Joi.string().valid("SE", "TE", "BE").required(),
    
    dob: Joi.date().required(),
    bloodGroup: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").required(),

    currentStreet: Joi.string().required(),
    currentCity: Joi.string().required(),
    pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required(),


    nativeStreet: Joi.string().required(),
    nativeCity: Joi.string().required(),
    nativePincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required(),

    category: Joi.string().valid("Open", "EWS", "EBC", "OBC", "SC", "ST", "Other").required(),
    
    mobileNo: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    parentMobileNo: Joi.string().pattern(/^[6-9]\d{9}$/).required(),

    
    // file validation is usually handled by multer
    // studentPhoto will be validated in middleware/controller after upload
});

const updateStudentSchema = Joi.object({
    firstName: Joi.string().pattern(/^[A-Za-z]+$/),
    middleName: Joi.string().pattern(/^[A-Za-z]+$/),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/),
    motherName: Joi.string().pattern(/^[A-Za-z]+$/),

    PRN: Joi.string().pattern(/^[1-9]\d{14}$/),
    branch: Joi.string().valid("Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical"),
    year: Joi.string().valid("SE", "TE", "BE"),
    
    dob: Joi.date(),
    bloodGroup: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),

    currentStreet: Joi.string(),
    currentCity: Joi.string(),
    pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/),


    nativeStreet: Joi.string(),
    nativeCity: Joi.string(),
    nativePincode: Joi.string().pattern(/^[1-9][0-9]{5}$/),

    category: Joi.string().valid("Open", "EWS", "EBC", "OBC", "SC", "ST", "Other"),
    
    mobileNo: Joi.string().pattern(/^[6-9]\d{9}$/),
    parentMobileNo: Joi.string().pattern(/^[6-9]\d{9}$/),

    
    // file validation is usually handled by multer
    // studentPhoto will be validated in middleware/controller after upload
});

const getStudentsValidation = Joi.object({
    year: Joi.string().valid("SE", "TE", "BE").optional(),
    search: Joi.string().max(100).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(20).optional()
});

module.exports = {
    importExcelSchema,
    addStudentDetailsSchema,
    updateStudentSchema,
    getStudentsValidation
};

