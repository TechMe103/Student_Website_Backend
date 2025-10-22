const Joi = require("joi");

// --------------------------- CREATE HIGHER STUDY --------------------------- //
const createHigherStudySchema = Joi.object({
    examName: Joi.string().valid("GATE", "CAT", "GRE", "TOFEL", "IELTS", "UPSC").required(),

    score: Joi.string().required(),
});

// --------------------------- UPDATE HIGHER STUDY --------------------------- //
const updateHigherStudySchema = Joi.object({
    examName: Joi.string().valid("GATE", "CAT", "GRE", "TOFEL", "IELTS", "UPSC"),

    score: Joi.string(),
});

module.exports = { createHigherStudySchema, updateHigherStudySchema };
