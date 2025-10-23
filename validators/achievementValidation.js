const Joi = require("joi");

const achievementSchema = Joi.object({
  category: Joi.string()
    .valid("Coding competitions", "Committee", "Hackathons", "Sports", "Cultural", "Technical")
    .required(),

  title: Joi.string().min(3).max(100).required(),

  description: Joi.string().min(10).max(500).required(),

  issuedBy: Joi.string().min(3).max(100).required(),

  date: Joi.object({
    from: Joi.date().required(),
    to: Joi.date().required(),
  }).required(),

  achievementType: Joi.string()
    .valid("Participation", "Winner", "Runner-up")
    .required(),

  teamMembers: Joi.array().items(Joi.string()).default([]),
});

module.exports = { achievementSchema };
