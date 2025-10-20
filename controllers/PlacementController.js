const Placement = require("../models/Placement");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const { uploadToCloudinary } = require("../helpers/UploadToCloudinary");

// --------------------------- CREATE PLACEMENT --------------------------- //
const createPlacement = async (req, res) => {
	try {
		const { id } = req.user; // Logged-in student ID

		const student = await Student.findById(id);
		if (!student) {
		return res.status(404).json({ success: false, message: "Student not found" });
		}

		const { companyName, role, placementType } = req.body;

		// Validate required fields
		if (!companyName || !role || !placementType) {
		return res.status(400).json({ success: false, message: "All fields are required" });
		}

		// Upload proof file to Cloudinary
		const placementProofFile = req.file;
		if (!placementProofFile) {
		return res.status(400).json({ success: false, message: "Placement proof is required" });
		}

		const uploadResult = await uploadToCloudinary(placementProofFile.path);

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

		res.status(201).json({ success: true, message: "Placement added successfully", placement });
	} catch (err) {
		console.error("Error in createPlacement:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// --------------------------- UPDATE PLACEMENT --------------------------- //
const updatePlacement = async (req, res) => {
	try {
		const userId = req.user.id;

		// Verify admin or student
		if (req.user.role === "admin") {
		const admin = await Admin.findById(userId);
		if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
		}

		if (req.user.role === "student") {
		const student = await Student.findById(userId);
		if (!student) return res.status(404).json({ success: false, message: "Student not found" });
		}

		const { placementId } = req.params;
		const existingPlacement = await Placement.findById(placementId);
		if (!existingPlacement) {
		return res.status(404).json({ success: false, message: "Placement not found" });
		}

		const { companyName, role, placementType } = req.body;

		const updatedData = {
			companyName,
			role,
			placementType,
		};

		// File update if new proof uploaded
		const placementProofFile = req.file;
		if (placementProofFile) {
		if (existingPlacement.placementProof?.publicId) {
			await cloudinary.uploader.destroy(existingPlacement.placementProof.publicId);
		}
		const uploadResult = await uploadToCloudinary(placementProofFile.path);
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

		res.status(200).json({ success: true, message: "Placement updated successfully", data: updatedPlacement });
	} catch (err) {
		console.error("Error in updatePlacement:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// --------------------------- DELETE PLACEMENT --------------------------- //
const deletePlacement = async (req, res) => {
	try {
		const userId = req.user.id;

		if (req.user.role === "admin") {
		const admin = await Admin.findById(userId);
		if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
		}

		if (req.user.role === "student") {
		const student = await Student.findById(userId);
		if (!student) return res.status(404).json({ success: false, message: "Student not found" });
		}

		const { placementId } = req.params;
		const placement = await Placement.findById(placementId);
		if (!placement) {
		return res.status(404).json({ success: false, message: "Placement not found" });
		}

		// Delete Cloudinary proof file
		if (placement.placementProof?.publicId) {
		await cloudinary.uploader.destroy(placement.placementProof.publicId);
		}

		await Placement.findByIdAndDelete(placementId);
		res.status(200).json({ success: true, message: "Placement deleted successfully" });
	} catch (err) {
		console.error("Error in deletePlacement:", err);
		res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// --------------------------- GET ALL PLACEMENTS (ADMIN) --------------------------- //
const getAllPlacements = async (req, res) => {
	try {

		const adminId=req.user.id;
		const adminExists = await Admin.findById(adminId);
		if (!adminExists) {
			return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
		}	

		const placements = await Placement.find()
		.populate({ path: "stuID", select: "name branch year" })
		.sort({ createdAt: -1 });

		res.status(200).json({ success: true, data: placements });
	} catch (err) {
		console.error("Error in getAllPlacements:", err);
		res.status(500).json({ success: false, message: "Server Error" });
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
		res.status(500).json({ success: false, message: "Server Error" });
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
		res.status(500).json({ success: false, message: "Server Error" });
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
		res.status(500).json({ success: false, message: "Server Error" });
	}
};

// --------------------------- EXPORTS --------------------------- //
module.exports = {
  createPlacement,
  updatePlacement,
  deletePlacement,
  getAllPlacements,
  getOwnPlacements,
  getStudentPlacementsByAdmin,
  getSinglePlacement,
};
