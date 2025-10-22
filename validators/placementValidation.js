const Joi = require("joi");

const createPlacementSchema = Joi.object({
    companyName: Joi.string().trim().required(),

    role: Joi.string().trim().required(),

    placementType: Joi.string().valid("Campus", "Off-Campus").required(),

});

const updatePlacementSchema = Joi.object({
    companyName: Joi.string().trim(),

    role: Joi.string().trim(),

    placementType: Joi.string().valid("Campus", "Off-Campus"),

});

module.exports = {createPlacementSchema, updatePlacementSchema};
