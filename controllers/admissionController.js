const Admission = require("../models/Admission");
const Student = require("../models/Student");

// CREATE Admission (Student Only)
const createAdmission = async (req, res) => {
  try {
    const studentId = req.user.id; // from JWT
    const { rollno, year, div, course, fees, academicYear } = req.body;

    // Verify student existence
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Prevent duplicate admission in same year
    const existing = await Admission.findOne({ stuID: studentId, academicYear });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Admission already exists for this academic year",
      });
    }

    // Create admission
    const admission = new Admission({
      stuID: studentId,
      rollno,
      year,
      div,
      course,
      fees,
      academicYear,
    });

    await admission.save();
    res.status(201).json({
      success: true,
      message: "Admission form submitted successfully",
      data: admission,
    });
  } catch (err) {
    console.error("Error creating admission:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while creating admission",
    });
  }
};

// GET all Admissions of logged-in Student
const getAdmissionsByStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const admissions = await Admission.find({ stuID: studentId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: admissions,
    });
  } catch (err) {
    console.error("Error fetching student admissions:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching admissions",
    });
  }
};

// UPDATE Admission (Student can edit only if pending)
const updateAdmission = async (req, res) => {
  try {
    const studentId = req.user.id;
    const admissionId = req.params.id;

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Admission not found" });
    }

    if (admission.stuID.toString() !== studentId) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (admission.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update admission after approval or rejection",
      });
    }

    // Allow only specific fields to be updated
    const allowedFields = ["rollno", "year", "div", "course", "fees", "academicYear"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) admission[field] = req.body[field];
    });

    await admission.save();

    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: admission,
    });
  } catch (err) {
    console.error("Error updating admission:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while updating admission",
    });
  }
};

// DELETE Admission (Student can delete only if pending)
const deleteAdmission = async (req, res) => {
  try {
    const studentId = req.user.id;
    const admissionId = req.params.id;

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Admission not found" });
    }

    if (admission.stuID.toString() !== studentId) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (admission.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admission after approval or rejection",
      });
    }

    await Admission.findByIdAndDelete(admissionId);

    res.status(200).json({
      success: true,
      message: "Admission deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting admission:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while deleting admission",
    });
  }
};

// ADMIN: Get All Admissions
const getAllAdmissions = async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ success: false, message: "Access denied" });

    const admissions = await Admission.find()
      .populate("stuID", "name email branch year div")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: admissions });
  } catch (err) {
    console.error("Error fetching all admissions:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching admissions",
    });
  }
};

// ADMIN: Update Admission Status (Approve/Reject)
const updateAdmissionStatus = async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ success: false, message: "Access denied" });

    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'",
      });
    }

    const admission = await Admission.findByIdAndUpdate(id, { status }, { new: true });

    if (!admission) {
      return res.status(404).json({ success: false, message: "Admission not found" });
    }

    res.status(200).json({
      success: true,
      message: `Admission ${status} successfully`,
      data: admission,
    });
  } catch (err) {
    console.error("Error updating admission status:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while updating status",
    });
  }
};

// ADMIN: Get All Unpaid Students
const getUnpaidStudents = async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ success: false, message: "Access denied" });

    const unpaid = await Admission.getUnpaidStudents();
    res.status(200).json({ success: true, data: unpaid });
  } catch (err) {
    console.error("Error fetching unpaid students:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching unpaid students",
    });
  }
};

module.exports = {
  // Student Routes
  createAdmission,
  getAdmissionsByStudent,
  updateAdmission,
  deleteAdmission,

  // Admin Routes
  getAllAdmissions,
  updateAdmissionStatus,
  getUnpaidStudents,
};
