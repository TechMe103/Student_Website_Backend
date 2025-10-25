const Admission = require("../models/Admission");
const Student = require("../models/Student");
const { admissionSchema, admissionStatusSchema, getAdmissionsValidation } = require("../validators/admissionValidation");

//Create admission (Student only)
const createAdmission = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const { error } = admissionSchema.validate(req.body);
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    const existing = await Admission.findOne({
      stuID: studentId,
      academicYear: req.body.academicYear,
    });
    if (existing)
      return res.status(400).json({ success: false, message: "Admission already exists for this academic year" });

    const admission = new Admission({
      stuID: studentId,
      ...req.body,
    });

    await admission.save();
    res.status(201).json({
      success: true,
      message: "Admission submitted successfully",
      data: admission,
    });
  } catch (err) {
    console.error("createAdmission error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//Get all admissions of a student
const getAdmissionsByStudent = async (req, res) => {
  try {
    const admissions = await Admission.find({ stuID: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: admissions });
  } catch (err) {
    console.error("getAdmissionsByStudent error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//Update admission (only if pending)
const updateAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission)
      return res.status(404).json({ success: false, message: "Admission not found" });

    if (admission.stuID.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (admission.status !== "pending")
      return res.status(400).json({ success: false, message: "Cannot update after approval/rejection" });

    const { error } = admissionSchema.validate(req.body);
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    Object.assign(admission, req.body);
    await admission.save();

    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: admission,
    });
  } catch (err) {
    console.error("updateAdmission error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//Delete admission (only if pending)
const deleteAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission)
      return res.status(404).json({ success: false, message: "Admission not found" });

    if (admission.stuID.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (admission.status !== "pending")
      return res.status(400).json({ success: false, message: "Cannot delete after approval/rejection" });

    await admission.remove();
    res.status(200).json({ success: true, message: "Admission deleted successfully" });
  } catch (err) {
    console.error("deleteAdmission error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//Admin=> Get all admissions (with search, pagination, filters)
const getAllAdmissions = async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    const { error, value } = getAdmissionsValidation.validate(req.query);
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    const page = Number(value.page || 1);
    const limit = Math.min(Number(value.limit || 10), 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (value.year) filter.year = value.year;
    if (value.academicYear) filter.academicYear = value.academicYear;
    if (value.filterPaid) filter.isFeesPaid = value.filterPaid === "paid";

    let searchQuery = {};
    if (value.search) {
      const regex = new RegExp(value.search, "i");
      searchQuery = {
        $or: [
          { rollno: regex },
          { div: regex },
          { course: regex },
          { academicYear: regex },
        ],
      };
    }

    const query = { ...filter, ...searchQuery };

    const [admissions, total] = await Promise.all([
      Admission.find(query)
        .populate("stuID", "name branch year")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Admission.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: admissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getAllAdmissions error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

//Admin=> Update admission status
const updateAdmissionStatus = async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    const { error } = admissionStatusSchema.validate(req.body);
    if (error)
      return res.status(400).json({ success: false, message: error.details[0].message });

    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!admission)
      return res.status(404).json({ success: false, message: "Admission not found" });

    res.status(200).json({
      success: true,
      message: `Admission ${req.body.status} successfully`,
      data: admission,
    });
  } catch (err) {
    console.error("updateAdmissionStatus error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

//Admin => Get unpaid students
const getUnpaidStudents = async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    const unpaid = await Admission.getUnpaidStudents();
    res.status(200).json({ success: true, data: unpaid });
  } catch (err) {
    console.error("getUnpaidStudents error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
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
