const Joi = require("joi");

const admissionSchema = Joi.object({
  rollno: Joi.string().min(1).max(20).optional(),
  year: Joi.string().valid("FY", "SY", "TY").optional(),
  div: Joi.string().max(5).optional(),
  course: Joi.string().trim().required(),
  fees: Joi.number().min(0).required(),
  isFeesPaid: Joi.boolean().optional(),
  isScholarshipApplied: Joi.boolean().optional(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
});

const admissionStatusSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
});

const getAdmissionsValidation = Joi.object({
  year: Joi.string().valid("FY", "SY", "TY").optional(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  filterPaid: Joi.string().valid("paid", "unpaid").optional(),
});

module.exports = { admissionSchema, admissionStatusSchema, getAdmissionsValidation };
