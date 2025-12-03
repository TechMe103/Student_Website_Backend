const Joi = require("joi");

const importExcelSchema = Joi.object({
    studentID: Joi.string().pattern(/^[0-9]{4}[A-Z]{4}[0-9]{3}$/).required(),
    email : Joi.string().email({ tlds: { allow: false } }).trim().lowercase().required(),
});

const addStudentDetailsSchema = Joi.object({
    firstName: Joi.string().pattern(/^[A-Za-z]+$/).trim().required(),
    middleName: Joi.string().pattern(/^[A-Za-z]+$/).trim().required(),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/).trim().required(),
    motherName: Joi.string().pattern(/^[A-Za-z]+$/).trim().required(),

    PRN: Joi.string().pattern(/^[1-9]\d{15}$/).trim().required(),
    branch: Joi.string().valid("Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical").required(),
    year: Joi.string().valid("SE", "TE", "BE").required(),
    
    dob: Joi.date().required(),
    bloodGroup: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").required(),

    currentStreet: Joi.string().trim().required(),
    currentCity: Joi.string().trim().required(),
    pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).trim().required(),

    nativeStreet: Joi.string().trim().required(),
    nativeCity: Joi.string().trim().required(),
    nativePincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).trim().required(),

    category: Joi.string().valid("Open", "EWS", "EBC", "OBC", "SC", "ST", "Other").required(),
    
    mobileNo: Joi.string().pattern(/^[6-9]\d{9}$/).trim().required(),
    parentMobileNo: Joi.string().pattern(/^[6-9]\d{9}$/).trim().required(),

    // New fields
    parentEmail: Joi.string().email({ tlds: { allow: false } }).trim().lowercase().required(),
    abcId: Joi.string().pattern(/^\d{12}$/).trim().required(), // exactly 12 digits

}).options({ 
    abortEarly: false,  // return all errors at once
    stripUnknown: true, // remove any extra fields
    convert: true        // convert types if possible (e.g., dob string -> Date)
});

const updateStudentSchema2 = Joi.object({
    firstName: Joi.string().pattern(/^[A-Za-z]+$/),
    middleName: Joi.string().pattern(/^[A-Za-z]+$/),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/),
    motherName: Joi.string().pattern(/^[A-Za-z]+$/),

    PRN: Joi.string().pattern(/^[1-9]\d{15}$/),
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

});

const updateStudentSchema = Joi.object({
    firstName: Joi.string().pattern(/^[A-Za-z]+$/).trim(),
    middleName: Joi.string().pattern(/^[A-Za-z]+$/).trim(),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/).trim(),
    motherName: Joi.string().pattern(/^[A-Za-z]+$/).trim(),

    PRN: Joi.string().pattern(/^[1-9]\d{15}$/).trim(),
    branch: Joi.string().valid("Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical"),
    year: Joi.string().valid("SE", "TE", "BE"),
    
    dob: Joi.date(),
    bloodGroup: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),

    currentStreet: Joi.string().trim(),
    currentCity: Joi.string().trim(),
    pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).trim(),

    nativeStreet: Joi.string().trim(),
    nativeCity: Joi.string().trim(),
    nativePincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).trim(),

    category: Joi.string().valid("Open", "EWS", "EBC", "OBC", "SC", "ST", "Other"),
    
    mobileNo: Joi.string().pattern(/^[6-9]\d{9}$/).trim(),
    parentMobileNo: Joi.string().pattern(/^[6-9]\d{9}$/).trim(),

    // New optional fields for update
    parentEmail: Joi.string().email({ tlds: { allow: false } }).trim().lowercase(),
    abcId: Joi.string().pattern(/^\d{12}$/).trim() // exactly 12 digits
}).options({ 
    abortEarly: false,  
    stripUnknown: true,
    convert: true
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

