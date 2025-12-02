// const Joi = require("joi");

// const createPlacementSchema = Joi.object({
//     companyName: Joi.string().trim().required(),

//     role: Joi.string().trim().required(),

//     placementType: Joi.string().valid("Campus", "Off-Campus").required(),

// });

// const updatePlacementSchema = Joi.object({
//     companyName: Joi.string().trim(),

//     role: Joi.string().trim(),

//     placementType: Joi.string().valid("Campus", "Off-Campus"),

// });

// const getPlacementsValidation = Joi.object({
//   year: Joi.string().valid("SE", "TE", "BE").optional(),
//   placementType: Joi.string().valid("Campus", "Off-Campus").optional(),
//   search: Joi.string().max(100).optional(),
//   page: Joi.number().integer().min(1).optional(),
//   limit: Joi.number().integer().min(1).max(20).optional()
// });

// module.exports = {createPlacementSchema, updatePlacementSchema, getPlacementsValidation};


const Joi = require("joi");


//Common reusable year pattern: 2023-24
const yearPattern = /^\d{4}-\d{2}$/;


// CREATE
const createPlacementSchema = Joi.object({

	companyName: Joi.string().trim().required(),

	role: Joi.string().trim().required(),

	placementType: Joi.string().valid("Campus", "Off-Campus").required(),

	package: Joi.number().positive().required(),

	placementYear: Joi.string().pattern(yearPattern).required(),

	passoutYear: Joi.string().pattern(yearPattern).required(),

	joiningYear: Joi.string().pattern(yearPattern).required(),
});


// UPDATE
const updatePlacementSchema = Joi.object({
	
	companyName: Joi.string().trim(),

	role: Joi.string().trim(),

	placementType: Joi.string().valid("Campus", "Off-Campus"),

	package: Joi.number().positive(),

	placementYear: Joi.string().pattern(yearPattern),

	passoutYear: Joi.string().pattern(yearPattern),

	joiningYear: Joi.string().pattern(yearPattern),

}).min(1); // at least one field is required to update


// GET / FILTER
const getPlacementsValidation = Joi.object({
	
	year: Joi.string().valid("SE", "TE", "BE").optional(),

	placementType: Joi.string().valid("Campus", "Off-Campus").optional(),

	search: Joi.string().max(100).optional(),

	page: Joi.number().integer().min(1).optional(),

	limit: Joi.number().integer().min(1).max(20).optional()
});

module.exports = { createPlacementSchema, updatePlacementSchema, getPlacementsValidation };
