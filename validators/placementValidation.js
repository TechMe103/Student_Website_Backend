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

const getPlacementsValidation = Joi.object({
  year: Joi.string().valid("SE", "TE", "BE").optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(20).optional()
});

module.exports = {createPlacementSchema, updatePlacementSchema, getPlacementsValidation};
