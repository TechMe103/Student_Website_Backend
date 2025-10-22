const Joi = require("joi");

const markSchema = Joi.object({
  subject: Joi.string().required(),
  score: Joi.number().min(0).required(),
  outOf: Joi.number().min(1).required()
});

const semInfoSchema = Joi.object({
  semester: Joi.number().integer().min(1).max(8).required(),
  attendance: Joi.number().min(0).max(100).required(),
  kts: Joi.array().items(Joi.string()).default([]),
  marks: Joi.array().items(markSchema).required(),
  isDefaulter: Joi.boolean().default(false)
});

module.exports = { semInfoSchema };
