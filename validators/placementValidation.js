const Joi = require("joi");

const createPlacementSchema = Joi.object({
    companyName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Company Name is required",
            "any.required": "Company Name is required",
        }),

    role: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
            "string.empty": "Role is required",
            "any.required": "Role is required",
        }),

    placementType: Joi.string()
        .valid("Campus", "Off-Campus")
        .required()
        .messages({
            "any.only": "Placement Type must be either 'Campus' or 'Off-Campus'",
            "any.required": "Placement Type is required",
        }),
});

module.exports = createPlacementSchema;
