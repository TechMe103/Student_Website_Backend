const Joi = require("joi");

const internshipValidationSchema = Joi.object({
    companyName: Joi.string().trim().min(2).required(),

    role: Joi.string().trim().min(2).required(),

    startDate: Joi.date().required(),

    endDate: Joi.date().greater(Joi.ref("startDate")).required(),

    durationMonths: Joi.number().integer().min(1).max(6).required(),

    isPaid: Joi.boolean().required(),

    stipend: Joi.when("isPaid", {
        is: true,
        then: Joi.number().min(1).required(),
        otherwise: Joi.forbidden()
    }),

    description: Joi.string().trim().min(10).required()
});


const updateInternshipValidationSchema = Joi.object({
    companyName: Joi.string().trim().min(2),

    role: Joi.string().trim().min(2),

    startDate: Joi.date(),

    endDate: Joi.date().greater(Joi.ref("startDate")),

    durationMonths: Joi.number().integer().min(1).max(6),

    isPaid: Joi.boolean(),

    stipend: Joi.when("isPaid", {
        is: true,
        then: Joi.number().min(1),
        otherwise: Joi.forbidden()
    }),

    description: Joi.string().trim().min(10)
});


const getInternshipsValidation = Joi.object({
  year: Joi.string().valid("SE", "TE", "BE").optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(20).optional()
});


module.exports = { internshipValidationSchema, updateInternshipValidationSchema, getInternshipsValidation };
