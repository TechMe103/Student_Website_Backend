const Internship = require("../models/Internship");
const Student = require("../models/Student");
const  {uploadToCloudinary}=require("../helpers/UploadToCloudinary");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");


const createInternship = async (req, res) => {
    try {
        const { id } = req.user;

        // Check if student exists
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const { companyName, startDate, endDate, role, durationMonths, isPaid: isPaidRaw, stipend, description } = req.body;

        if(!companyName || companyName===""){
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Convert isPaid to boolean if it's a string
        const isPaid = isPaidRaw === true || isPaidRaw === "true";

        // Manual check: stipend required if isPaid is true
        if (isPaid && (stipend === undefined || stipend === null)) {
            return res.status(400).json({ success: false, message: "Stipend amount required if internship is paid" });
        }

        // Build stipendInfo object
        const stipendInfo = { isPaid };
        if (isPaid) stipendInfo.stipend = stipend;

        // Access uploaded files safely
        const internshipReport = req.files?.internshipReport?.[0];
        const photoProof = req.files?.photoProof?.[0];

        if (!internshipReport || !photoProof) {
            return res.status(400).json({ success: false, message: "Both internship report and photo proof are required" });
        }

        // Upload files to Cloudinary and get both URL and publicId
        const reportResult = await uploadToCloudinary(internshipReport.path);
        const proofResult = await uploadToCloudinary(photoProof.path);

        // Create Internship
        const internship = new Internship({
            stuID: id,
            companyName,
            startDate,
            endDate,
            role,
            durationMonths,
            description,
            stipendInfo,
            internshipReport: {
                url: reportResult.url,
                publicId: reportResult.publicId
            },
            photoProof: {
                url: proofResult.url,
                publicId: proofResult.publicId
            }
        });

        await internship.save();
        res.status(201).json({ success: true, internship });

    } catch (err) {
        console.error("Error in createInternship controller: ", err);
        // 🧹 Cleanup Cloudinary if files were uploaded but save failed
        if (req.files) {
            const uploadedFiles = [];
            if (req.files.internshipReport?.[0]) uploadedFiles.push(req.files.internshipReport[0]);
            if (req.files.photoProof?.[0]) uploadedFiles.push(req.files.photoProof[0]);
            for (const file of uploadedFiles) {
                try {
                    const uploadRes = await uploadToCloudinary(file.path);
                    if (uploadRes?.publicId) {
                        await cloudinary.uploader.destroy(uploadRes.publicId);
                    }
                } catch (cleanupErr) {
                    console.error("Failed to cleanup Cloudinary file:", cleanupErr);
                }
            }
        }
        res.status(500).json({ success: false, message: "Internal Server Error. Please Try Again Later" });
    }
};


//=> get internship by stu
const getInternshipByStu = async(req , res) => {
    try{
        const internship = await Internship.find( { stuID : req.params.stuID }).populate("stuID" , "name roll branch");
        res.json(internship);
    }catch(err) {
        res.status(500).json({ error : err.message });
    }
};



//get all internships --for admin 
const getAllInternships = async (req, res) => {
    try {


        const adminId = req.user.id;

        // Verify admin exists
        const adminExists = await Admin.findById(adminId);
        if (!adminExists) {
            return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
        }

        // Find all internships and populate student details
        const internships = await Internship.find()
            .populate({
                path: "stuID",
                select: "name branch year"  // only these fields
            })
            .sort({ createdAt: -1 }); // newest first

        res.status(200).json({ success: true, data: internships });
    } catch (error) {
        console.error("Error in getAllInternships:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};





// Get internships by studentId --for student

const getOwnInternships = async (req, res) => {

    try {
        const studentId = req.user.id; // always the logged-in student

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const internships = await Internship.find({ stuID: studentId }).sort({ startDate: -1 });

        res.status(200).json({ success: true, data: internships });
    } catch (error) {
        console.error("Error in getOwnInternships:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


//GET internships by studentId -- for admin
//use case:- admin clicks on student -> clicks on internships -> then internships are shown
// controllers/adminInternshipController.js
const getStudentInternshipsByAdmin = async (req, res) => {
    try {
        const adminId = req.user.id;

        // Verify admin exists
        const adminExists = await Admin.findById(adminId);
        if (!adminExists) {
            return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
        }

        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        // Verify student exists
        const studentExists = await Student.findById(studentId);
        if (!studentExists) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const internships = await Internship.find({ stuID: studentId })
            .populate({
                path: "stuID",
                select: "name branch year"  // only these fields
            })
            .sort({ startDate: -1 });

        res.status(200).json({ success: true, data: internships });
    } catch (error) {
        console.error("Error in getStudentInternshipsByAdmin:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};






// GET single internship details by internshipId --for both admin and student
//use case for student:- when student clicks on a single internship to  view details or update it( before upddating, details are required)
//use case for admin:- in all internshipd, admin clicks on single internship to get its details
const getSingleInternship = async (req, res) => {
    try {
        const { internshipId } = req.params;
        if (!internshipId) {
            return res.status(400).json({ success: false, message: "Internship ID is required" });
        }

        const userId=req.user.id;

        //check this userID in both admin or student, if not exissts error should come
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

        const internship = await Internship.findById(internshipId)
            .populate({ path: "stuID", select: "name branch year" });

        if (!internship) {
            return res.status(404).json({ success: false, message: "Internship not found" });
        }

        res.status(200).json({ success: true, data: internship });
    } catch (error) {
        console.error("Error in getSingleInternship:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


const updateInternship = async (req, res) => {
    try {
        const userId = req.user.id;

        // Authorization checks (already perfect in your version)
        if (req.user.role === "admin") {
        const adminExists = await Admin.findById(userId);
        if (!adminExists) {
            return res.status(403).json({ success: false, message: "Admin not found or unauthorized" });
        }
        }

        if (req.user.role === "student") {
        const student = await Student.findById(userId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }
        }

        const { internshipId } = req.params;
        const existingInternship = await Internship.findById(internshipId);
        if (!existingInternship) {
        return res.status(404).json({ success: false, message: "Internship not found" });
        }

        const { companyName, startDate, endDate, role, durationMonths, isPaid: isPaidRaw, stipend, description } = req.body;

        const isPaid = isPaidRaw === true || isPaidRaw === "true";
        const stipendInfo = { isPaid };
        if (isPaid) stipendInfo.stipend = stipend;

        const updatedData = {
        companyName,
        startDate,
        endDate,
        role,
        durationMonths,
        description,
        stipendInfo
        };

        // Track newly uploaded public IDs (for cleanup if DB fails)
        let newReportPublicId = null;
        let newProofPublicId = null;

        // Handle internshipReport upload
        const internshipReportFile = req.files?.internshipReport?.[0];
        if (internshipReportFile) {
        const reportResult = await uploadToCloudinary(internshipReportFile.path);
        newReportPublicId = reportResult.publicId;

        // Delete old report file after successful upload (safer)
        if (existingInternship.internshipReport?.publicId) {
            await cloudinary.uploader.destroy(existingInternship.internshipReport.publicId);
        }

        updatedData.internshipReport = {
            url: reportResult.url,
            publicId: reportResult.publicId
        };
        }

        // Handle photoProof upload
        const photoProofFile = req.files?.photoProof?.[0];
        if (photoProofFile) {
        const proofResult = await uploadToCloudinary(photoProofFile.path);
        newProofPublicId = proofResult.publicId;

        // Delete old proof file after successful upload (safer)
        if (existingInternship.photoProof?.publicId) {
            await cloudinary.uploader.destroy(existingInternship.photoProof.publicId);
        }

        updatedData.photoProof = {
            url: proofResult.url,
            publicId: proofResult.publicId
        };
        }

        // Update DB
        const updatedInternship = await Internship.findByIdAndUpdate(
        internshipId,
        { $set: updatedData },
        { new: true, runValidators: true }
        );

        if (!updatedInternship) {
        // If DB update failed — cleanup newly uploaded files
        if (newReportPublicId) await cloudinary.uploader.destroy(newReportPublicId);
        if (newProofPublicId) await cloudinary.uploader.destroy(newProofPublicId);
        return res.status(500).json({ success: false, message: "Failed to update internship" });
        }

        res.status(200).json({
        success: true,
        message: "Internship updated successfully",
        data: updatedInternship
        });

    } catch (err) {
        console.error("Error in updateInternship:", err);

        // Cleanup any uploaded files if the error occurred mid-way
        if (newReportPublicId) await cloudinary.uploader.destroy(newReportPublicId);
        if (newProofPublicId) await cloudinary.uploader.destroy(newProofPublicId);

        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// DELETE a specific internship
const deleteInternship = async (req, res) => {
  try {

    const userId=req.user.id; //its ok if request is from student or admin, as both can delete or update , but user has to exist compulsory

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

    const { internshipId } = req.params;

    // Find internship
    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    // Delete files from Cloudinary if public_id exists
    if (internship.internshipReport.publicId) {
      await cloudinary.uploader.destroy(internship.internshipReport.publicId);
    }
    if (internship.photoProof.publicId) {
      await cloudinary.uploader.destroy(internship.photoProof.publicId);
    }

    // Delete internship document from DB
    await Internship.findByIdAndDelete(internshipId);

    res.status(200).json({ success: true, message: "Internship deleted successfully" });
  } catch (err) {
    console.error("Error in deleteInternship controller:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


module.exports = { createInternship , getAllInternships  , getOwnInternships , getStudentInternshipsByAdmin , getSingleInternship , updateInternship , deleteInternship };