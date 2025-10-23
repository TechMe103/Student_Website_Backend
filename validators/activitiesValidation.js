const Joi = require("joi");

const activitySchema = Joi.object({
  type: Joi.string()
    .valid("Committee", "Sports", "Hackathon")
    .required(),
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(5).max(500).required(),
  date: Joi.date().required(),
  certificateURL: Joi.string().uri().optional(),
});

module.exports = { activitySchema };
