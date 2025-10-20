const Joi = require("joi");

const internshipSchema = Joi.object({
    companyName: Joi.string().required(),

    role: Joi.string().required(),

    startDate: Joi.date().required(),

    endDate: Joi.date().greater(Joi.ref("startDate")).required(),

    durationMonths: Joi.number().integer().min(1).max(6).required(),

    isPaid: Joi.boolean().truthy("true").falsy("false").required(),

    stipend: Joi.when("isPaid", {
        is: true,
        then: Joi.number().required(),
        otherwise: Joi.number().allow(null, ""),
    }),

    description: Joi.string().required(),
});

module.exports = { internshipSchema };
