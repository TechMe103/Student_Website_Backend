const Joi = require("joi");

const admissionSchema = Joi.object({
  rollno: Joi.string().min(1).max(20).required(),
  year: Joi.string().valid("FY", "SY", "TY").required(),
  div: Joi.string().max(5).required(),
  course: Joi.string().required(),
  fees: Joi.number().min(0).required(),
  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .required(),
});

const admissionStatusSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
});

module.exports = { admissionSchema, admissionStatusSchema };
