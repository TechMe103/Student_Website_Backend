const Placement = require("../models/Placement");
const Student = require("../models/Student");
const cloudinary = require("../config/cloudinaryConfig");
const {createPlacementSchema, updatePlacementSchema, getPlacementsValidation} = require("../validators/placementValidation");
const { deleteMultipleFromCloudinary } = require("../helpers/DeleteMultipleFromCloudinary");
const { validateAndUploadFiles } = require("../helpers/ValidateAndUploadFiles");
const mongoose= require("mongoose");

const fileConfigs = [
  {
    fieldName: "placementProof",
    allowedTypes: ["application/pdf"],
    maxSize: 5 * 1024 * 1024,
    friendlyName: "Placement Proof"
  }
];

// CREATE PLACEMENT 
const createPlacement = async (req, res) => {

	let uploadedFiles;
	let dbSaved = false;

	try {
		let stuID;

		if (req.user.role === "student") {
			stuID = req.user.id;
		} 
		else if (req.user.role === "admin") {
			stuID = req.body.studentId;

			if(!stuID){
				return res.status(400).json({ success: false, message: "Student ID compulsory for admin" });
			}

			if (!mongoose.Types.ObjectId.isValid(stuID)) {
				return res.status(400).json({ success: false, message: "Invalid Student ID format" });
			}

			const student = await Student.findById(stuID);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found. Cannot create placement." });
			}
		}

		const { companyName, role, placementType, package, placementYear, passoutYear, joiningYear } = req.body;

		// convert
		const parsedPackage = Number(package);

		if (isNaN(parsedPackage) || parsedPackage <= 0) {
			return res.status(400).json({ success: false, message: "Package must be a valid positive number" });
		}

		// Joi Validation
		const { error } = createPlacementSchema.validate({
			companyName,
			role,
			placementType,
			package: parsedPackage,
			placementYear,
			passoutYear,
			joiningYear
		}, { abortEarly: false });

		if (error) {
			const validationErrors = error.details.map(err => ({
				field: err.path[0],
				message: err.message
			}));

			return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
		}

		// Logical year validation
		const extractStartYear = (year) => Number(year.split("-")[0]);

		if (extractStartYear(placementYear) > extractStartYear(joiningYear)) {
			return res.status(400).json({ success: false, message: "Placement Year cannot be greater than Joining Year" });
		}

		if (!req.files || Object.keys(req.files).length === 0) {
			return res.status(400).json({ success: false, message: "Placement proof is required" });
		}


		// Upload & Validate File via Helper
		uploadedFiles = await validateAndUploadFiles(req.files, fileConfigs);

		// Create Placement in DB
		const placement = new Placement({
			stuID,
			companyName,
			role,
			placementType,
			package: parsedPackage,
			placementYear,
			passoutYear,
			joiningYear,
			placementProof: {
				url: uploadedFiles.placementProof.url,
				publicId: uploadedFiles.placementProof.publicId
			}
		});

		await placement.save();
		dbSaved = true;

		return res.status(201).json({ success: true, message: "Placement added successfully", placement });

	} catch (err) {
		console.error("Error in createPlacement controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
       
		// Rollback cloudinary upload if DB save fails
		if (!dbSaved && uploadedFiles) {
			const publicIds = Object.values(uploadedFiles).map(file => file.publicId);
			await deleteMultipleFromCloudinary(publicIds);
		}

		return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please try again later." });
	}
};


// UPDATE PLACEMENT
const updatePlacement = async (req, res) => {

	let uploadedFiles = null;
	let dbSaved = false;

	try {

		const { placementId } = req.params;

		if (!placementId) {
			return res.status(400).json({ success: false, message: "Placement ID is required" });
		}

		if (!mongoose.Types.ObjectId.isValid(placementId)) {
			return res.status(400).json({ success: false, message: "Invalid Placement ID format" });
		}

		const existingPlacement = await Placement.findById(placementId);

		if (!existingPlacement) {
			return res.status(404).json({ success: false, message: "Placement not found" });
		}

		

		// Role based logic
		if (req.user.role === "student") {

			const stuID = req.user.id;

			if (existingPlacement.stuID.toString() !== stuID.toString()) {
				return res.status(403).json({ success: false, message: "Placement does not belong to logged in student" });
			}

		}

		// Extract body
		let { companyName, role, placementType, package, placementYear, passoutYear, joiningYear } = req.body;

		// Sanitize input
		const parsedPackage = package === undefined || package === null || package === "" ? undefined : Number(package);


		// Joi validation
		const { error, value: updatedData } = updatePlacementSchema.validate({
			companyName,
			role,
			placementType,
			package: parsedPackage,
			placementYear,
			passoutYear,
			joiningYear
		}, { abortEarly: false });

		if (error) {
			const validationErrors = error.details.map(err => ({
				field: err.path[0],
				message: err.message
			}));

			return res.status(400).json({
				success: false,
				message: "Validation failed",
				errors: validationErrors
			});
		}

		// Logical validation
		const extractStartYear = (year) => Number(year.split("-")[0]);

		if (updatedData.placementYear && updatedData.joiningYear) {
			if (extractStartYear(updatedData.placementYear) > extractStartYear(updatedData.joiningYear)) {
				return res.status(400).json({ success: false, message: "Placement Year cannot be greater than Joining Year" });
					
			}
		}


		// File Handling

		if (req.files && Object.keys(req.files).length > 0) {

			uploadedFiles = await validateAndUploadFiles(req.files, fileConfigs);

			if (uploadedFiles.placementProof) {
				const oldPublicId = existingPlacement.placementProof?.publicId;

				updatedData.placementProof = {
					url: uploadedFiles.placementProof.url,
					publicId: uploadedFiles.placementProof.publicId
				};

				// delete old
				if (oldPublicId) {
					await cloudinary.uploader.destroy(oldPublicId).catch((err) => {
						console.error("Error in updatePlacement:", err);
					});
				}
			}
		}

		if (Object.keys(updatedData).length === 0) {
			return res.status(400).json({ success: false, message: "No valid fields provided for update" });
		}


		const updatedPlacement = await Placement.findByIdAndUpdate(
			placementId,
			{ $set: updatedData },
			{ new: true, runValidators: true }
		);

		dbSaved = true;

		return res.status(200).json({ success: true, message: "Placement updated successfully", data: updatedPlacement });

	} catch (err) {

		console.error("Error in updatePlacement controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);

		// Rollback uploaded file if DB fails
		if (!dbSaved && uploadedFiles) {
			const publicIds = Object.values(uploadedFiles).map(file => file.publicId);
			await deleteMultipleFromCloudinary(publicIds);
		}

		return res.status(500).json({ success: false, message: err.message || "Some Error Occurred. Please try again later." });
	}
};

// DELETE PLACEMENT
const deletePlacement = async (req, res) => {
	try {
		

		const { placementId } = req.params;
		const placement = await Placement.findById(placementId);
		if (!placement) {
			return res.status(404).json({ success: false, message: "Placement not found" });
		}

		if (req.user.role === "student") {

			const stuID = req.user.id;

			if(placement.stuID.toString() !== stuID.toString()){
				return res.status(403).json({ success: false, message: "Placement does not belong to the logged in student" });
			}
		}

		const delResult = await Placement.findByIdAndDelete(placementId);
		

		// Delete Cloudinary proof file
		if ( delResult && placement.placementProof?.publicId) {
			await cloudinary.uploader.destroy(placement.placementProof.publicId).catch((err) =>{
				console.error("Cloudinary delete failed:", err);
			});
		}

		
		return res.status(200).json({ success: true, message: "Placement deleted successfully" });
	} catch (err) {
		console.error("Error in deletePlacement controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
	
};


//GET PLACEMENTS (search by placement fields & student name + year filter + pagination) --version2 --admin only
const getPlacements = async (req, res) => {
	try {
		// Get and trim query params
		const year = req.query.year?.trim();
		const search = req.query.search?.trim();
		const placementType = req.query.placementType?.trim();
		const page = req.query.page;
		const limit = req.query.limit;

		// Validate input
		const { error, value } = getPlacementsValidation.validate(
			{ year, search, page, limit, placementType },
			{ abortEarly: false }
		);
		if (error) {
			const validationErrors = error.details.map(err => ({
				field: err.path[0],
				message: err.message
			}));
			return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
		}

		const pageNum = value.page || 1;
		const limitNum = Math.min(value.limit || 10, 20);
		const skip = (pageNum - 1) * limitNum;

		// Build aggregation pipeline
		const pipeline = [];

		// Lookup student details
		pipeline.push({
			$lookup: {
				from: "students",
				localField: "stuID",
				foreignField: "_id",
				as: "student"
			}
		});

		// Unwind student array safely
		pipeline.push({ $unwind: { path: "$student", preserveNullAndEmptyArrays: true } });

		// Build match conditions
		const match = {};

		if (year) match["student.year"] = year;

		if (search) {
			const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			match.$or = [
				{ companyName: { $regex: safeSearch, $options: "i" } },
				{ role: { $regex: safeSearch, $options: "i" } },
				{ "student.name.firstName": { $regex: safeSearch, $options: "i" } },
				{ "student.name.middleName": { $regex: safeSearch, $options: "i" } },
				{ "student.name.lastName": { $regex: safeSearch, $options: "i" } },
			];
		}

		if (placementType) match.placementType = placementType;

		if (Object.keys(match).length) pipeline.push({ $match: match });

		// Use $facet for pagination + total count
		const results = await Placement.aggregate([
			...pipeline,
			{
				$facet: {
					data: [
						{ $sort: { createdAt: -1 } },
						{ $skip: skip },
						{ $limit: limitNum },
						{
							$project: {
								companyName: 1,
								role: 1,
								placementType: 1,
								placementProof: "$placementProof.url", // only expose url
								stuID: "$student._id",
								studentName: "$student.name",
								studentYear: "$student.year"
							}
						}
					],
					totalCount: [{ $count: "total" }]
				}
			}
		]);

		const placements = results[0]?.data || [];
		const total = results[0]?.totalCount[0]?.total || 0;

		return res.json({
			success: true,
			data: placements,
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
		});

	} catch (err) {
		console.error("Error in getPlacements controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
		return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
	}
};



// GET STUDENT'S OWN PLACEMENTS --student only
const getOwnPlacements = async (req, res) => {
	try {
		let studentId = req.user.id;

		if(!studentId){
			return res.status(400).json({success:false, message:"student Id is required."});
		}
		
		
		if (!mongoose.Types.ObjectId.isValid(studentId)) {
			return res.status(400).json({ success: false, message: "Invalid Student ID format"});
		}
		

		const placements = await Placement.find({ stuID: studentId }).sort({ createdAt: -1 }).lean();
		return res.status(200).json({ success: true, data: placements });
	} catch (err) {
		console.error("Error in getOwnPlacements controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    
	}
};

// GET STUDENT'S PLACEMENTS --admin only
const getStudentPlacementsByAdmin = async (req, res) => {
	try {

		const { studentId } = req.params;
		if (!studentId) {
			return res.status(400).json({ success: false, message: "Student ID is required" });
		}

		if (!mongoose.Types.ObjectId.isValid(studentId)) {
			return res.status(400).json({ success: false, message: "Invalid Student ID format"});
		}

		const placements = await Placement.find({ stuID: studentId }).sort({ createdAt: -1 }).lean();

		if (!placements.length) {
			return res.status(404).json({ success: false, message: "Student not found or no placements available" });
		}

		return res.status(200).json({ success: true, data: placements });
	} catch (err) {
		console.error("Error in getStudentPlacementsByAdmin controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
	}
};

// GET SINGLE PLACEMENT --student or admin
const getSinglePlacement = async (req, res) => {
  try {
	
		const { placementId } = req.params;
		if (!placementId) {
			return res.status(400).json({ success: false, message: "Placement ID is required" });
		}

		if (!mongoose.Types.ObjectId.isValid(placementId)) {
			return res.status(400).json({ success: false, message: "Invalid placement ID format"});
		}

		const placement = await Placement.findById(placementId)
		.populate({ path: "stuID", select: "name branch year" }).lean();

		if (!placement) {
			return res.status(404).json({ success: false, message: "Placement not found" });
		}

		if (req.user.role === "student" && placement.stuID._id.toString() !== req.user.id) {
			return res.status(403).json({ success: false, message: "Unauthorized access" });
		}


		return res.status(200).json({ success: true, data: placement });
	} catch (err) {
		console.error("Error in getSinglePlacement controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
	}
};


module.exports = {
	createPlacement,
	updatePlacement,
	deletePlacement,
	getPlacements,
	getOwnPlacements,
	getStudentPlacementsByAdmin,
	getSinglePlacement,
};
