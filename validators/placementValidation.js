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

	companyName: Joi.string().trim().min(1).required(),

	role: Joi.string().trim().min(1).required(),

	placementType: Joi.string().valid("Campus", "Off-Campus").required(),

	package: Joi.number().positive().min(1).required(),

	placementYear: Joi.string().min(1).pattern(yearPattern).required(),

	passoutYear: Joi.string().min(1).pattern(yearPattern).required(),

	joiningYear: Joi.string().min(1).pattern(yearPattern).required(),
});


// UPDATE
const updatePlacementSchema = Joi.object({

	companyName: Joi.string().trim().min(1).empty("").optional(),

	role: Joi.string().trim().min(1).empty("").optional(),

	placementType: Joi.string().valid("Campus", "Off-Campus").empty("").optional(),

	package: Joi.number().positive().min(1).empty("").optional(),

	placementYear: Joi.string().pattern(yearPattern).empty("").optional(),

	passoutYear: Joi.string().pattern(yearPattern).empty("").optional(),

	joiningYear: Joi.string().pattern(yearPattern).empty("").optional(),

}).min(1)	// at least one field is required to update
.options({
	stripUnknown: true,   // removes extra fields
	convert: false,         // string -> number conversion not allowed
	abortEarly: false
}); 


// GET / FILTER
const getPlacementsValidation = Joi.object({
	
	year: Joi.string().valid("SE", "TE", "BE").optional(),

	placementType: Joi.string().valid("Campus", "Off-Campus").optional(),

	search: Joi.string().max(100).optional(),

	page: Joi.number().integer().min(1).optional(),

	limit: Joi.number().integer().min(1).max(20).optional()
});

module.exports = { createPlacementSchema, updatePlacementSchema, getPlacementsValidation };
