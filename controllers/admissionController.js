const Admission = require("../models/Admission");
const Student = require("../models/Student");
const { admissionSchema, admissionStatusSchema } = require("../validators/admissionValidation");

// CREATE Admission (Student Only)
const createAdmission = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Validate request
    const { error } = admissionSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Check student existence
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Prevent duplicate admission for same academic year
    const existing = await Admission.findOne({ stuID: studentId, academicYear: req.body.academicYear });
    if (existing) return res.status(400).json({ success: false, message: "Admission already exists for this academic year" });

    const admission = new Admission({ stuID: studentId, ...req.body });
    await admission.save();

    res.status(201).json({ success: true, message: "Admission submitted successfully", data: admission });
  } catch (err) {
    console.error("Error creating admission:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// GET Students Admissions
const getAdmissionsByStudent = async (req, res) => {
  try {
    const admissions = await Admission.find({ stuID: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: admissions });
  } catch (err) {
    console.error("Error fetching admissions:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// UPDATE Admission => (Stu can update only if pending)
const updateAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });
    if (admission.stuID.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });
    if (admission.status !== "pending") return res.status(400).json({ success: false, message: "Cannot update after approval/rejection" });

    const { error } = admissionSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    Object.assign(admission, req.body);
    await admission.save();

    res.status(200).json({ success: true, message: "Admission updated successfully", data: admission });
  } catch (err) {
    console.error("Error updating admission:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// DELETE Admission (Stu can del only if pending)
const deleteAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });
    if (admission.stuID.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });
    if (admission.status !== "pending") return res.status(400).json({ success: false, message: "Cannot delete after approval/rejection" });

    await admission.remove();
    res.status(200).json({ success: true, message: "Admission deleted successfully" });
  } catch (err) {
    console.error("Error deleting admission:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ADMIN: Get All Admissions
const getAllAdmissions = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: "Access denied" });

    const admissions = await Admission.find().populate("stuID", "name email branch year div").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: admissions });
  } catch (err) {
    console.error("Error fetching admissions:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ADMIN: Update Admission Status
const updateAdmissionStatus = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: "Access denied" });

    const { error } = admissionStatusSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const admission = await Admission.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });

    res.status(200).json({ success: true, message: `Admission ${req.body.status} successfully`, data: admission });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ADMIN: Get Unpaid Students
const getUnpaidStudents = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: "Access denied" });

    const unpaid = await Admission.getUnpaidStudents();
    res.status(200).json({ success: true, data: unpaid });
  } catch (err) {
    console.error("Error fetching unpaid students:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  createAdmission,
  getAdmissionsByStudent,
  updateAdmission,
  deleteAdmission,
  getAllAdmissions,
  updateAdmissionStatus,
  getUnpaidStudents,
};

