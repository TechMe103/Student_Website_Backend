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

const getHigherStudiesValidation = Joi.object({
  year: Joi.string().valid("SE", "TE", "BE").optional(),
  examName: Joi.string().valid("GATE", "CAT", "GRE", "TOFEL", "IELTS", "UPSC").optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(20).optional(),
});


module.exports = { createHigherStudySchema, updateHigherStudySchema, getHigherStudiesValidation };
