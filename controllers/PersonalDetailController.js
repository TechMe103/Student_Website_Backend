const PersonalDetail = require("../models/PersonalDetail");
const Student = require("../models/Student");
const Admin = require("../models/Admin");


// --------------------------- CREATE PERSONAL DETAIL (student only) --------------------------- //
const createPersonalDetail = async (req, res) => {
    try {
        const { id } = req.user;

        // Check if student exists
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Destructure fields from request body
        const {
            dob,
            bloodGroup,
            currentStreet,
            currentCity,
            currentState,
            nativeStreet,
            nativeCity,
            nativeState,
            category,
            mobileNo,
            parentMobileNo
        } = req.body;

		// Basic required field check
		if (!dob || !bloodGroup || !currentStreet || !currentCity || !currentState || !nativeStreet || !nativeCity || !nativeState || !category || !mobileNo || !parentMobileNo) {
			return res.status(400).json({ success: false, message: "All fields are required" });
		}

        // Build nested objects for addresses
        const currentAddress = {
            street: currentStreet,
            city: currentCity,
            state: currentState
        };

        const nativeAddress = {
            street: nativeStreet,
            city: nativeCity,
            state: nativeState
        };

        // Create PersonalDetail
        const personalDetail = new PersonalDetail({
            stuID: id,
            dob,
            bloodGroup,
            currentAddress,
            nativeAddress,
            category,
            mobileNo,
            parentMobileNo
        });

        await personalDetail.save();
        res.status(201).json({ success: true, data: personalDetail });
    } catch (err) {
        console.error("Error in createPersonalDetail:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// --------------------------- UPDATE PERSONAL DETAIL (student/admin) --------------------------- //
const updatePersonalDetail = async (req, res) => {
    try {
        const userId = req.user.id;

        // Verify user
        if (req.user.role === "admin") {
            const admin = await Admin.findById(userId);
            if (!admin) return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
        }
        if (req.user.role === "student") {
            const student = await Student.findById(userId);
            if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        }

        const { personalDetailId } = req.params;
        const existingDetail = await PersonalDetail.findById(personalDetailId);
        if (!existingDetail) return res.status(404).json({ success: false, message: "Personal detail not found" });

        // Destructure fields from request body
        const {
            dob,
            bloodGroup,
            currentStreet,
            currentCity,
            currentState,
            nativeStreet,
            nativeCity,
            nativeState,
            category,
            mobileNo,
            parentMobileNo
        } = req.body;

		// Basic required field check
		if (!dob || !bloodGroup || !currentStreet || !currentCity || !currentState || !nativeStreet || !nativeCity || !nativeState || !category || !mobileNo || !parentMobileNo) {
			return res.status(400).json({ success: false, message: "All fields are required" });
		}

        // Build nested objects for addresses
        const currentAddress = {
            street: currentStreet,
            city: currentCity,
            state: currentState
        };

        const nativeAddress = {
            street: nativeStreet,
            city: nativeCity,
            state: nativeState
        };

		const updatedData = {dob, bloodGroup, category, mobileNo, parentMobileNo,currentAddress, nativeAddress};

        const updatedDetail = await PersonalDetail.findByIdAndUpdate(
            personalDetailId,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, message: "Personal detail updated", data: updatedDetail });
    } catch (err) {
        console.error("Error in updatePersonalDetail:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// --------------------------- DELETE PERSONAL DETAIL (student/admin) --------------------------- //
const deletePersonalDetail = async (req, res) => {
    try {
        const userId = req.user.id;

        // Verify user
        if (req.user.role === "admin") {
            const admin = await Admin.findById(userId);
            if (!admin) return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
        }
        if (req.user.role === "student") {
            const student = await Student.findById(userId);
            if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        }

        const { personalDetailId } = req.params;
        const detail = await PersonalDetail.findById(personalDetailId);
        if (!detail) return res.status(404).json({ success: false, message: "Personal detail not found" });

		

        await PersonalDetail.findByIdAndDelete(personalDetailId);
        res.status(200).json({ success: true, message: "Personal detail deleted" });
    } catch (err) {
        console.error("Error in deletePersonalDetail:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



// --------------------------- GET PERSONAL DETAIL BY STUDENT ID (admin) --------------------------- //
const getPersonalDetailByStudent = async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role === "admin") {
            const admin = await Admin.findById(userId);
            if (!admin) return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
        }

        const { studentId } = req.params;
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const detail = await PersonalDetail.findOne({ stuID: studentId });
        if (!detail) return res.status(404).json({ success: false, message: "Personal detail not found" });

        res.status(200).json({ success: true, data: detail });
    } catch (err) {
        console.error("Error in getPersonalDetailByStudent:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// --------------------------- GET OWN PERSONAL DETAIL (student) --------------------------- //
const getOwnPersonalDetail = async (req, res) => {
    try {
        const studentId = req.user.id;
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const detail = await PersonalDetail.findOne({ stuID: studentId });
        if (!detail) return res.status(404).json({ success: false, message: "Personal detail not found" });

        res.status(200).json({ success: true, data: detail });
    } catch (err) {
        console.error("Error in getOwnPersonalDetail:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    createPersonalDetail,
    updatePersonalDetail,
    deletePersonalDetail,
    getPersonalDetailByStudent,
    getOwnPersonalDetail,
};
