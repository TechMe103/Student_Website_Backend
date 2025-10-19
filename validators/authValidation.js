const Joi = require("joi");

const signupSchema = Joi.object({
    studentID: Joi.string().pattern(/^[0-9]{4}[A-Z]{4}[0-9]{3}$/).required(),
    email : Joi.string().email().required(),
    password: Joi.string().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,14}$/).required(),
    firstName: Joi.string().pattern(/^[A-Za-z]+$/).required(),
    middleName: Joi.string().pattern(/^[A-Za-z]+$/).required(),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/).required(),
    PRN : Joi.string().pattern(/^[1-9]\d{14}$/).required(),
    branch: Joi.string().valid("Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical").required(),
    year: Joi.string().valid("SE", "TE", "BE").required(),

});

const loginSchema = Joi.object({
    studentID: Joi.string().pattern(/^[0-9]{4}[A-Z]{4}[0-9]{3}$/).required(),
    password: Joi.string().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,14}$/).required(),

});



module.exports= {signupSchema, loginSchema};