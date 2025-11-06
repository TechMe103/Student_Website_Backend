
const Joi = require("joi");

const achievementSchema = Joi.object({
  category: Joi.string()
    .valid(
      "Coding competitions",
      "Committee",
      "Hackathons",
      "Sports",
      "Cultural",
      "Technical",
      "Other"
    )
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

  // Optional Certification Course Field
  certification_course: Joi.string()
    .trim()
    .max(500)
    .allow("")
    .messages({
      "string.max": "Certification course name too long (max 500 characters)",
    }),

  // course Certification Certificate
  course_certificate: Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
  }).optional(),

  // Uploaded Event Photos
  photographs: Joi.object({
    eventPhoto: Joi.object({
      url: Joi.string().uri().optional(),
      publicId: Joi.string().optional(),
    }).optional(),

    certificate: Joi.object({
      url: Joi.string().uri().optional(),
      publicId: Joi.string().optional(),
    }).optional(),
  }).optional(),
});

module.exports = { achievementSchema };
