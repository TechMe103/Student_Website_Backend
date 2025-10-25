const Placement = require("../models/Placement");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");
const {createPlacementSchema, updatePlacementSchema, getPlacementsValidation} = require("../validators/placementValidation");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_REPORT_TYPE = "application/pdf";

// --------------------------- CREATE PLACEMENT (student) --------------------------- //
const createPlacement = async (req, res) => {

	let dbSaved=false;
	let uploadResult=null;
	try {
		const { id } = req.user; 

		const student = await Student.findById(id);
		if (!student) {
			return res.status(404).json({ success: false, message: "Student not found" });
		}

		const { companyName, role, placementType } = req.body;

		// Validate required fields
		if (!companyName || !role || !placementType) {
		return res.status(400).json({ success: false, message: "All fields are required" });
		}

		// Validate input using Joi
		const { error } = createPlacementSchema.validate({ companyName, role, placementType }, { abortEarly: false });
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

		// Upload proof file to Cloudinary
		const placementProofFile = req.file;
		if (!placementProofFile) {
			return res.status(400).json({ success: false, message: "Placement proof is required" });
		}

		if (placementProofFile.mimetype !== ALLOWED_REPORT_TYPE){
            return res.status(400).json({ success: false, message: "Placement Proof must be a PDF" });
        }

        if (placementProofFile.size > MAX_FILE_SIZE){
            return res.status(400).json({ success: false, message: "Placement Proof exceeds 5MB" });
        }

		uploadResult = await uploadToCloudinary(placementProofFile.path);

		// Create Placement record
		const placement = new Placement({
			stuID: id,
			companyName,
			role,
			placementType,
			placementProof: {
				url: uploadResult.url,
				publicId: uploadResult.publicId,
			},
		});

		await placement.save();
		dbSaved=true;

		res.status(201).json({ success: true, message: "Placement added successfully", placement });
	} catch (err) {
		console.error("Error in createPlacement:", err);
		// if save to DB operation fails, then files stored in cloudinary must be deleted, as files are useless now
		if (!dbSaved && uploadResult) {
			if (uploadResult.publicId) await cloudinary.uploader.destroy(uploadResult.publicId);
		}
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// --------------------------- UPDATE PLACEMENT --------------------------- //
const updatePlacement = async (req, res) => {
	let uploadResult=null;
	let dbSaved=false;
	try {
		const userId = req.user.id;

		const { placementId } = req.params;
		const existingPlacement = await Placement.findById(placementId);
		if (!existingPlacement) {
			return res.status(404).json({ success: false, message: "Placement not found" });
		}

		// Verify admin or student
		if (req.user.role === "admin") {
			const admin = await Admin.findById(userId);
			if (!admin) {
				return res.status(403).json({ success: false, message: "Admin not authorized" });
			}
		}

		if (req.user.role === "student") {
			const student = await Student.findById(userId);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found" });
			}


			if(existingPlacement.stuID.toString() !== userId){
				return res.status(400).json({ success: false, message: "Placement does not belong to the logged in student" });
			}
		}

		

		const { companyName, role, placementType } = req.body;

		// Validate input using Joi
		const { error } = updatePlacementSchema.validate({ companyName, role, placementType }, { abortEarly: false });
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

		const updatedData = {
			companyName,
			role,
			placementType,
		};

		// File update if new proof uploaded
		const placementProofFile = req.file;

		if (placementProofFile) {

			if (placementProofFile.mimetype !== ALLOWED_REPORT_TYPE){
				return res.status(400).json({ success: false, message: "Placement Proof must be a PDF" });
			}

			if (placementProofFile.size > MAX_FILE_SIZE){
				return res.status(400).json({ success: false, message: "Placement Proof exceeds 5MB" });
			}
			uploadResult = await uploadToCloudinary(placementProofFile.path);
			updatedData.placementProof = {
				url: uploadResult.url,
				publicId: uploadResult.publicId,
			};
		}

		const updatedPlacement = await Placement.findByIdAndUpdate(
		placementId,
		{ $set: updatedData },
		{ new: true, runValidators: true }
		);
		dbSaved=true;

		// Delete previous file only if new file saved in cloudinary and in DB
		if (updatedPlacement && existingPlacement.placementProof?.publicId) {
			try {
				await cloudinary.uploader.destroy(existingPlacement.placementProof.publicId);
			} catch (err) {
				console.error("Cloudinary delete failed:", err);
			}
		}

		res.status(200).json({ success: true, message: "Placement updated successfully", data: updatedPlacement });
	} catch (err) {
		console.error("Error in updatePlacement:", err);
		if (!dbSaved && uploadResult) {
			await cloudinary.uploader.destroy(uploadResult.publicId);
		}
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// --------------------------- DELETE PLACEMENT --------------------------- //
const deletePlacement = async (req, res) => {
	try {
		const userId = req.user.id;

		const { placementId } = req.params;
		const placement = await Placement.findById(placementId);
		if (!placement) {
			return res.status(404).json({ success: false, message: "Placement not found" });
		}

		if (req.user.role === "admin") {
			const admin = await Admin.findById(userId);
			if (!admin) {
				return res.status(403).json({ success: false, message: "Admin not authorized" });
			}
		}

		if (req.user.role === "student") {
			const student = await Student.findById(userId);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found" });
			}

			if(placement.stuID.toString() !== userId.toString()){
				return res.status(403).json({ success: false, message: "Placement does not belong to the logged in student" });
			}
		}

		const delResult = await Placement.findByIdAndDelete(placementId);
		

		// Delete Cloudinary proof file
		if ( delResult && placement.placementProof?.publicId) {
			try {
				await cloudinary.uploader.destroy(placement.placementProof.publicId);
			} catch(err) {
				console.error("Cloudinary delete failed:", err);
			}
		}

		
		res.status(200).json({ success: true, message: "Placement deleted successfully" });
	} catch (err) {
		console.error("Error in deletePlacement:", err);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// ================= GET PLACEMENTS (search by placement fields & student name + year filter + pagination) =================
const getPlacements = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify admin
    const adminExists = await Admin.exists({ _id: adminId });
    if (!adminExists) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Get query params
    const { year, search, page, limit, placementType } = req.query;

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

    // Unwind student array
    pipeline.push({ $unwind: "$student" });

    // Build match conditions
    const match = {};

    if (year) {
      match["student.year"] = year.trim();
    }

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

    if (placementType) {
      match.placementType = placementType.trim();
    }

    if (Object.keys(match).length) {
      pipeline.push({ $match: match });
    }

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
                placementProof: 1,
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
    console.error({
      level: "error",
      message: "Error in getPlacements controller",
      error: err.message,
      stack: err.stack,
      time: new Date().toISOString()
    });
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// --------------------------- GET STUDENT'S OWN PLACEMENTS --------------------------- //
const getOwnPlacements = async (req, res) => {
	try {
		const studentId = req.user.id;

		const student = await Student.findById(studentId);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		const placements = await Placement.find({ stuID: studentId }).sort({ createdAt: -1 });
		res.status(200).json({ success: true, data: placements });
	} catch (err) {
		console.error("Error in getOwnPlacements:", err);
		return res.status(500).json({ success: false, message: "Server Error" });
	}
};

// --------------------------- GET STUDENT'S PLACEMENTS (ADMIN VIEW) --------------------------- //
const getStudentPlacementsByAdmin = async (req, res) => {
	try {
		const adminId = req.user.id;
		const admin = await Admin.findById(adminId);
		if (!admin) {
		return res.status(403).json({ success: false, message: "Admin not authorized" });
		}

		const { studentId } = req.params;
		if (!studentId) {
		return res.status(400).json({ success: false, message: "Student ID is required" });
		}

		const student = await Student.findById(studentId);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		const placements = await Placement.find({ stuID: studentId }).sort({ createdAt: -1 });
		res.status(200).json({ success: true, data: placements });
	} catch (err) {
		console.error("Error in getStudentPlacementsByAdmin:", err);
		return res.status(500).json({ success: false, message: "Server Error" });
	}
};

// --------------------------- GET SINGLE PLACEMENT --------------------------- //
const getSinglePlacement = async (req, res) => {
  try {
		const userId=req.user.id; 
	
		if(req.user.role==="admin"){
			const adminExists = await Admin.findById(userId);
			if (!adminExists) {
				return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
			}
		}
	
		if(req.user.role==="student"){
			const student = await Student.findById(userId);
			if (!student) {
				return res.status(404).json({ success: false, message: "Student not found" });
			}
		}
	
		const { placementId } = req.params;
		if (!placementId) {
		return res.status(400).json({ success: false, message: "Placement ID is required" });
		}

		const placement = await Placement.findById(placementId)
		.populate({ path: "stuID", select: "name branch year" });

		if (!placement) {
		return res.status(404).json({ success: false, message: "Placement not found" });
		}

		res.status(200).json({ success: true, data: placement });
	} catch (err) {
		console.error("Error in getSinglePlacement:", err);
		return res.status(500).json({ success: false, message: "Server Error" });
	}
};

// --------------------------- EXPORTS --------------------------- //
module.exports = {
  createPlacement,
  updatePlacement,
  deletePlacement,
  getPlacements,
  getOwnPlacements,
  getStudentPlacementsByAdmin,
  getSinglePlacement,
};
