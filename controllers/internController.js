const Internship = require("../models/Internship");
const Student = require("../models/Student");
const  {uploadToCloudinary}=require("../helpers/UploadToCloudinary");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const {deleteMultipleFromCloudinary} = require("../helpers/DeleteMultipleFromCloudinary");
const {validateAndUploadFiles} = require("../helpers/ValidateAndUploadFiles");
const mongoose=require("mongoose");

const { internshipValidationSchema, updateInternshipValidationSchema, getInternshipsValidation } = require("../validators/internshipValidation");

const fileConfigs = [
  {
    fieldName: "internshipReport",
    allowedTypes: ["application/pdf"],
    maxSize: 5 * 1024 * 1024,
    friendlyName: "Internship Report"
  },
  {
    fieldName: "photoProof",
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
    maxSize: 5 * 1024 * 1024,
    friendlyName: "Photo Proof"
  }
];


const createInternship = async (req, res) => {

    let uploadedFiles;
    let dbSaved=false; //flag to track if save to Db operations succeeds or fails

    try {
        const { id } = req.user;

        let stuID;

        if(req.user.role === "student"){
            stuID=req.user.id;
        }else if(req.user.role==="admin"){
            stuID=req.body.studentId;
            const student = await Student.findById(stuID);
            if (!student) {
                return res.status(404).json({ success: false, message: "Student not found. Cannot create internship."});
            }
        }

        const { companyName, startDate, endDate, role, durationMonths, isPaid: isPaidRaw, stipend, description } = req.body;

        // Convert strings to proper types
        const parsedDurationMonths = Number(durationMonths);
        const parsedStipend = stipend ? Number(stipend) : undefined;
        const parsedIsPaid = isPaidRaw === "true" || isPaidRaw === true;

        // Validate input using Joi
		const { error } = internshipValidationSchema.validate({ companyName, startDate, endDate, role, durationMonths : parsedDurationMonths, isPaid: parsedIsPaid, stipend : parsedStipend, description }, { abortEarly: false });
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

        // Manual check
        if (parsedIsPaid && (parsedStipend === undefined || parsedStipend === null)) {
            return res.status(400).json({ success: false, message: "Stipend amount required if internship is paid" });
        }

        // Build stipendInfo object
        const stipendInfo = { isPaid: parsedIsPaid };
        if (parsedIsPaid) stipendInfo.stipend = parsedStipend;


        uploadedFiles = await validateAndUploadFiles(req.files, fileConfigs);
        

        // Create Internship
        const internship = new Internship({
            stuID: stuID,
            companyName,
            startDate,
            endDate,
            role,
            durationMonths : parsedDurationMonths,
            description,
            stipendInfo,
            internshipReport: {
                url:  uploadedFiles.internshipReport.url,
                publicId:  uploadedFiles.internshipReport.publicId
            },
            photoProof: {
                url:  uploadedFiles.photoProof.url,
                publicId:  uploadedFiles.photoProof.publicId
            }
        });

        const saveResult = await internship.save();
        dbSaved=true;   //set flag if DB save is sucessful

        return res.status(201).json({ success: true, internship });

    } catch (err) {
        console.error("Error in getSingleInternship controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        
        // if save to DB operation fails, then files stored in cloudinary must be deleted, as files are useless now
        if (!dbSaved && uploadedFiles) {

            //create publicId array
            const publicIds = Object.values(uploadedFiles).map(file => file.publicId);

            await deleteMultipleFromCloudinary(publicIds);
        }

        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};



// GET INTERNSHIPS (with optional pagination, search, year filter, and paid/unpaid filter)
const getInternships = async (req, res) => {
    try {

        // Get query params
        const { year, search, page, limit, isPaid } = req.query;

        // Validate input
        const { error, value } = getInternshipsValidation.validate(
        { year, search, page, limit, isPaid },
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
            { description: { $regex: safeSearch, $options: "i" } },
            { "student.name.firstName": { $regex: safeSearch, $options: "i" } },
            { "student.name.middleName": { $regex: safeSearch, $options: "i" } },
            { "student.name.lastName": { $regex: safeSearch, $options: "i" } },
        ];
        }

        // Filter by paid/unpaid
        if (isPaid === "true") match["stipendInfo.isPaid"] = true;
        else if (isPaid === "false") match["stipendInfo.isPaid"] = false;

        if (Object.keys(match).length) {
        pipeline.push({ $match: match });
        }

        // Use $facet for pagination + total count in one query
        const results = await Internship.aggregate([
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
                    startDate: 1,
                    endDate: 1,
                    durationMonths: 1,
                    stipendInfo: 1,
                    description: 1,
                    internshipReport: 1,
                    photoProof: 1,
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

        const internships = results[0]?.data || [];
        const total = results[0]?.totalCount[0]?.total || 0;

        return res.json({ 
            success: true,
            data: internships,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });

    } catch (err) {
        console.error("Error in getInternships controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};


// Get internships by studentId --for student
const getOwnInternships = async (req, res) => {

    try {
        const studentId = req.user.id; // always the logged-in student

        const internships = await Internship.find({ stuID: studentId }).sort({ startDate: -1 });

        return res.status(200).json({ success: true, data: internships });
    } catch (err) {
        console.error("Error in getOwnInternships controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};


//GET internships by studentId -- for admin
//use case:- admin clicks on student -> clicks on internships -> then internships are shown
// controllers/adminInternshipController.js
const getStudentInternshipsByAdmin = async (req, res) => {
    try {

        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

         if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, message: "Invalid internship ID format"});
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

        return res.status(200).json({ success: true, data: internships });
    } catch (err) {
        console.error("Error in getInternships controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};


// GET single internship details by internshipId --for both admin and student
//use case for student:- when student clicks on a single internship to  view details or update it( before upddating, details are required)
//use case for admin:- in all internshipd, admin clicks on single internship to get its details
const getSingleInternship = async (req, res) => {
    try {
        const { internshipId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(internshipId)) {
            return res.status(400).json({ success: false, message: "Invalid internship ID format"});
        }
        
        if (!internshipId) {
            return res.status(400).json({ success: false, message: "Internship ID is required" });
        }


        const internship = await Internship.findById(internshipId)
            .populate({ path: "stuID", select: "name branch year" });

        if (!internship) {
            return res.status(404).json({ success: false, message: "Internship not found" });
        }

        if(req.user.role==="student"){
            if(internship.stuID != req.user.id){
                return res.status(401).json({ success: false, message: "Requested resource does not belong to the logged in student." });
            }
        }

        return res.status(200).json({ success: true, data: internship });
    } catch (err) {
        console.error("Error in getSingleInternship controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};


// Update Internship
const updateInternship = async (req, res) => {

    let dbSaved = false;

    // Track newly uploaded public IDs (for cleanup if DB fails)
    let newPublicIds = [];

    try {

        const { internshipId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(internshipId)) {
            return res.status(400).json({ success: false, message: "Invalid internship ID format" });
        }

        const existingInternship = await Internship.findById(internshipId);
        if (!existingInternship) {
            return res.status(404).json({ success: false, message: "Internship not found" });
        }

        if (req.user.role === "student") {
            if (existingInternship.stuID.toString() !== req.user.id.toString()) {
                return res.status(403).json({ success: false, message: "Internship does not belong to the logged in student" });
            }
        }

        const { companyName, startDate, endDate, role, durationMonths, isPaid: isPaidRaw, stipend, description } = req.body;

        const parsedDurationMonths = Number(durationMonths);
        const parsedStipend = stipend ? Number(stipend) : undefined;
        const parsedIsPaid = isPaidRaw === "true" || isPaidRaw === true;

        const { error } = updateInternshipValidationSchema.validate(
            { companyName, startDate, endDate, role, durationMonths: parsedDurationMonths, isPaid: parsedIsPaid, stipend: parsedStipend, description },
            { abortEarly: false }
        );

        if (error) {
            const validationErrors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));

            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        if (parsedIsPaid && (parsedStipend === undefined || parsedStipend === null)) {
            return res.status(400).json({ success: false, message: "Stipend amount required if internship is paid" });
        }

        const stipendInfo = { isPaid: parsedIsPaid };
        if (parsedIsPaid) stipendInfo.stipend = parsedStipend;

        const updatedData = {
            companyName,
            startDate,
            endDate,
            role,
            durationMonths: parsedDurationMonths,
            description,
            stipendInfo
        };

        /* ---------------------- FILE HANDLING LOGIC ---------------------- */

        const filteredFiles = {};

        if (req.files?.internshipReport?.length > 0) {
            filteredFiles.internshipReport = req.files.internshipReport;
        }

        if (req.files?.photoProof?.length > 0) {
            filteredFiles.photoProof = req.files.photoProof;
        }

        const activeConfigs = fileConfigs.filter(cfg => filteredFiles[cfg.fieldName]);

        let uploadedFiles = {};

        if (Object.keys(filteredFiles).length > 0) {
            uploadedFiles = await validateAndUploadFiles(filteredFiles, activeConfigs);
        }

        /* ---------- DELETE OLD FILES + ADD NEW ---------- */

        if (uploadedFiles.internshipReport) {

            const oldPublicId = existingInternship.internshipReport?.publicId;
            if (oldPublicId) {
                await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
            }

            updatedData.internshipReport = {
                url: uploadedFiles.internshipReport.url,
                publicId: uploadedFiles.internshipReport.publicId
            };

            newPublicIds.push(uploadedFiles.internshipReport.publicId);
        }

        if (uploadedFiles.photoProof) {

            const oldPublicId = existingInternship.photoProof?.publicId;
            if (oldPublicId) {
                await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
            }

            updatedData.photoProof = {
                url: uploadedFiles.photoProof.url,
                publicId: uploadedFiles.photoProof.publicId
            };

            newPublicIds.push(uploadedFiles.photoProof.publicId);
        }

        /* ---------------------- DB UPDATE ---------------------- */

        const updatedInternship = await Internship.findByIdAndUpdate(
            internshipId,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        dbSaved = true;

        return res.status(200).json({ success: true, message: "Internship updated successfully", data: updatedInternship });

    } catch (err) {
        console.error("Error in updateInternship controller: ",  "\ntime = ", new Date().toISOString(), "\nError: ", err );

        if (!dbSaved && newPublicIds.length > 0) {
            await deleteMultipleFromCloudinary(newPublicIds);
        }

        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};


// DELETE a specific internship --make ti atomic lateron
const deleteInternship = async (req, res) => {
    try {

        const userId=req.user.id; //its ok if request is from student or admin, as both can delete or update , but user has to exist compulsory

        const { internshipId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(internshipId)) {
            return res.status(400).json({ success: false, message: "Invalid internship ID format"});
        }

        // Find internship
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            return res.status(404).json({ success: false, message: "Internship not found" });
        }

        if(req.user.role==="student"){

            if(internship.stuID.toString() !== userId.toString()){
                return res.status(400).json({ success: false, message: "Resource does not belong to logged in student." });
            }
        }


        // Delete files from Cloudinary if public_id exists
        const publicIdsToDelete = [];

            if (internship.internshipReport?.publicId) {
                publicIdsToDelete.push(internship.internshipReport.publicId);
            }
            if (internship.photoProof?.publicId) {
                publicIdsToDelete.push(internship.photoProof.publicId);
            }

            // 4. Delete internship from DB
            await Internship.findByIdAndDelete(internshipId);

            // 5. Delete files from Cloudinary (helper handles errors internally)
            await deleteMultipleFromCloudinary(publicIdsToDelete);

            
        return res.status(200).json({ success: true, message: "Internship deleted successfully" });

    } catch (err) {
        console.error("Error in deleteInternship controller: ", "\ntime = ", new Date().toISOString(), "\nError: ", err);
        return res.status(500).json({ success: false, message: err.message || "Some Error Occured. Please Try Again Later." });
    }
};


module.exports = { createInternship, getInternships , getOwnInternships , getStudentInternshipsByAdmin , getSingleInternship , updateInternship , deleteInternship };