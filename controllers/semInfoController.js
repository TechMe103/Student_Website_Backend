const SemesterInfo = require("../models/SemesterInfo");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { semInfoSchema } = require("../validators/seminfoValidation");

// Helper to calculate defaulter
const calculateDefaulter = (attendance, kts) => {
  return attendance < 75 || (kts && kts.length > 0);
};

// CREATE SEMESTER INFO
const addSemInfo = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "student") return res.status(403).json({ success: false, message: "Only students can add semester info" });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const { error } = semInfoSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { semester, attendance, kts, marks } = req.body;

    const semInfo = new SemesterInfo({
      stuID: id,
      semester,
      attendance,
      kts,
      marks,
      isDefaulter: calculateDefaulter(attendance, kts)
    });

    await semInfo.save();

    res.status(201).json({ success: true, message: "Semester info added successfully", data: semInfo });
  } catch (err) {
    console.error("Error in addSemInfo:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// UPDATE SEMESTER INFO
const updateSemInfo = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { id: semInfoId } = req.params;

    const semInfo = await SemesterInfo.findById(semInfoId);
    if (!semInfo) return res.status(404).json({ success: false, message: "Semester info not found" });

    if (role === "student" && semInfo.stuID.toString() !== id) {
      return res.status(403).json({ success: false, message: "Not authorized to update this record" });
    }

    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    const { error } = semInfoSchema.validate(req.body, { presence: "optional", allowUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Only update fields that exist
    const updatedData = {};
    ["semester", "attendance", "kts", "marks"].forEach(field => {
      if (req.body[field] !== undefined) updatedData[field] = req.body[field];
    });

    // Recalculate isDefaulter if attendance or KTs change
    if (updatedData.attendance !== undefined || updatedData.kts !== undefined) {
      updatedData.isDefaulter = calculateDefaulter(
        updatedData.attendance ?? semInfo.attendance,
        updatedData.kts ?? semInfo.kts
      );
    }

    const updatedSemInfo = await SemesterInfo.findByIdAndUpdate(semInfoId, { $set: updatedData }, { new: true, runValidators: true });

    res.status(200).json({ success: true, message: "Semester info updated successfully", data: updatedSemInfo });
  } catch (err) {
    console.error("Error in updateSemInfo:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// DELETE SEMESTER INFO
const deleteSemInfo = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { id: semInfoId } = req.params;

    const semInfo = await SemesterInfo.findById(semInfoId);
    if (!semInfo) return res.status(404).json({ success: false, message: "Semester info not found" });

    if (role === "student" && semInfo.stuID.toString() !== id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this record" });
    }

    if (role === "admin") {
      const admin = await Admin.findById(id);
      if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });
    }

    await SemesterInfo.findByIdAndDelete(semInfoId);
    res.status(200).json({ success: true, message: "Semester info deleted successfully" });
  } catch (err) {
    console.error("Error in deleteSemInfo:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET ALL SEMESTER INFOS (ADMIN)
// GET ALL SEMESTER INFOS (ADMIN) with filter + search + pagination
const getAllSemInfos = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can view all semester records" });
    }

    const admin = await Admin.findById(id);
    if (!admin) return res.status(403).json({ success: false, message: "Admin not authorized" });

    //Extract filters from query params
    const { semester, isDefaulter, search, page = 1, limit = 10 } = req.query;

    //Build query object
    const query = {};
    if (semester) query.semester = Number(semester);
    if (isDefaulter !== undefined) query.isDefaulter = isDefaulter === "true";

    //Pagination setup
    const skip = (Number(page) - 1) * Number(limit);

    //If search by student name
    let semQuery = SemesterInfo.find(query)
      .populate({
        path: "stuID",
        select: "name roll branch year",
        match: search ? { name: { $regex: search, $options: "i" } } : {}, // case-insensitive
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const semData = await semQuery;

    //Total count (ignoring search filter in populate)
    const total = await SemesterInfo.countDocuments(query);

    //Remove nulls from search (when populate didn't match)
    const filteredData = semData.filter(item => item.stuID !== null);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      count: filteredData.length,
      data: filteredData,
    });
  } catch (err) {
    console.error("Error in getAllSemInfos:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// GET LOGGED-IN STUDENT'S SEMESTER INFOS
// GET LOGGED-IN STUDENT'S SEMESTER INFOS (with filter + search + pagination)
const getOwnSemInfos = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== "student") {
      return res.status(403).json({ success: false, message: "Only students can access their own semester info" });
    }

    //Extract query params
    const { semester, isDefaulter, search, page = 1, limit = 5 } = req.query;

    //Build base query
    const query = { stuID: id };
    if (semester) query.semester = Number(semester);
    if (isDefaulter !== undefined) query.isDefaulter = isDefaulter === "true";

    //Pagination setup
    const skip = (Number(page) - 1) * Number(limit);

    //Search by subject name (inside marks array)
    let searchCondition = {};
    if (search) {
      searchCondition = {
        marks: { $elemMatch: { subject: { $regex: search, $options: "i" } } }
      };
    }

    //Fetch filtered + searched data
    const semInfos = await SemesterInfo.find({ ...query, ...searchCondition })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    //Total count for pagination
    const total = await SemesterInfo.countDocuments({ ...query, ...searchCondition });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      count: semInfos.length,
      data: semInfos
    });
  } catch (err) {
    console.error("Error in getOwnSemInfos:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET SPECIFIC STUDENT'S SEMESTER INFOS (ADMIN)
// GET SPECIFIC STUDENT'S SEMESTER INFOS (ADMIN) with filter + search + pagination
const getStudentSemInfosByAdmin = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { studentId } = req.params;

    if (role !== "admin") 
      return res.status(403).json({ success: false, message: "Only admins can view student semester info" });

    const student = await Student.findById(studentId);
    if (!student) 
      return res.status(404).json({ success: false, message: "Student not found" });

    // Extract filters from query params
    const { semester, isDefaulter, search, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { stuID: studentId };
    if (semester) query.semester = Number(semester);
    if (isDefaulter !== undefined) query.isDefaulter = isDefaulter === "true";

    // Pagination setup
    const skip = (Number(page) - 1) * Number(limit);

    // Search by subject name (inside marks array)
    let searchCondition = {};
    if (search) {
      searchCondition = {
        marks: { $elemMatch: { subject: { $regex: search, $options: "i" } } }
      };
    }

    // Fetch data with filters + search + pagination
    const semInfos = await SemesterInfo.find({ ...query, ...searchCondition })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SemesterInfo.countDocuments({ ...query, ...searchCondition });

    res.status(200).json({
      success: true,
      student: { name: student.name, roll: student.roll, branch: student.branch, year: student.year },
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      count: semInfos.length,
      data: semInfos
    });
  } catch (err) {
    console.error("Error in getStudentSemInfosByAdmin:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  addSemInfo,
  updateSemInfo,
  deleteSemInfo,
  getAllSemInfos,
  getOwnSemInfos,
  getStudentSemInfosByAdmin
};
