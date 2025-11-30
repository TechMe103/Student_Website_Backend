const Internship = require("../models/Internship");
const Student = require("../models/Student");
const  {uploadToCloudinary}=require("../helpers/UploadToCloudinary");
const Admin = require("../models/Admin");
const cloudinary = require("../config/cloudinaryConfig");
const {deleteMultipleFromCloudinary} = require("../helpers/DeleteMultipleFromCloudinary");
const {validateAndUploadFiles} = require("../helpers/ValidateAndUploadFiles");

const { internshipValidationSchema, updateInternshipValidationSchema, getInternshipsValidation } = require("../validators/internshipValidation");

// small helper function to make upload of two files atomic operation
const uploadInternshipFiles = async (reportPath, proofPath) => {
    const reportResult = await uploadToCloudinary(reportPath);
    try {
        const proofResult = await uploadToCloudinary(proofPath);
        return { reportResult, proofResult };
    } catch (err) {
        // rollback first upload immediately
        await cloudinary.uploader.destroy(reportResult.publicId);
        throw err;
    }
};


// Allowed types & size
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_REPORT_TYPE = "application/pdf";
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png"];


const createInternship = async (req, res) => {

    let uploadedFiles;
    let dbSaved=false; //flag to track if save to Db operations succeeds or fails

    try {
        const { id } = req.user;

        // Check if student exists
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
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


        uploadedFiles = await validateAndUploadFiles(req.files, [
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
        ]);
        

        // Create Internship
        const internship = new Internship({
            stuID: id,
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
        console.error("Error in createInternship controller: ", err);

        // if save to DB operation fails, then files stored in cloudinary must be deleted, as files are useless now
        if (!dbSaved && uploadedFiles) {

            //create publicId array
            const publicIds = Object.values(uploadedFiles).map(file => file.publicId);

            await deleteMultipleFromCloudinary(publicIds);
        }

        return res.status(500).json({ success: false, message: err.message || "Something went wrong. Please try again later." });
    }
};



// GET INTERNSHIPS (with optional pagination, search, year filter, and paid/unpaid filter)
const getInternships = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify admin
    const adminExists = await Admin.exists({ _id: adminId });
    if (!adminExists) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

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
    console.error({
      level: "error",
      message: "Error in getInternships controller",
      error: err.message,
      stack: err.stack,
      time: new Date().toISOString()
    });
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// GET INTERNSHIPS (with optional paid/unpaid filter, simplified + production ready)

// const getInternships = async (req, res) => {
//   try {
//     const adminId = req.user.id;

//     // ✅ Verify admin access
//     const adminExists = await Admin.exists({ _id: adminId });
//     if (!adminExists) {
//         return res.status(403).json({ success: false, message: "Unauthorized" });
//     }

//     // ✅ Get query params
//     const { year, search, page, limit, paid } = req.query; // added 'paid'

//     // ✅ Validate input
//     const { error, value } = getInternshipsValidation.validate(
//         { year, search, page, limit, paid },
//         { abortEarly: false }
//     );
//     if (error) {
//         const validationErrors = error.details.map(err => ({
//             field: err.path[0],
//             message: err.message,
//         }));
//         return res.status(400).json({
//             success: false,
//             message: "Validation failed",
//             errors: validationErrors,
//         });
//     }

//     const pageNum = value.page || 1;
//     const limitNum = Math.min(value.limit || 10, 20);
//     const skip = (pageNum - 1) * limitNum;

//     // ✅ Build main filter
//     const filter = {};

//     // ✅ Filter by year (SE, TE, BE)
//     if (year) {
//         const studentIds = await Student.find({ year: year.trim() }).distinct("_id");
//         filter.stuID = { $in: studentIds };
//     }

//     // ✅ Filter by paid/unpaid
//     if (value.paid !== undefined) {
//         // Convert string 'true'/'false' to boolean
//         const isPaid = value.paid === "true";
//         filter["stipendInfo.isPaid"] = isPaid;
//     }

//     // ✅ Search filter
//     if (search) {
//         const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
//         filter.$or = [
//             { companyName: { $regex: safeSearch, $options: "i" } },
//             { role: { $regex: safeSearch, $options: "i" } },
//             { description: { $regex: safeSearch, $options: "i" } },
//         ];
//     }

//     // ✅ Total count for pagination
//     const total = await Internship.countDocuments(filter);

//     // ✅ Fetch internships + student details
//     const internships = await Internship.find(filter)
//         .populate({
//             path: "stuID",
//             select: "name year branch", // only include student name & year
//         })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum)
//         .lean();

//     // ✅ Format consistent response
//     const formattedData = internships.map(intern => ({
//         _id: intern._id,
//         companyName: intern.companyName,
//         role: intern.role,
//         startDate: intern.startDate,
//         endDate: intern.endDate,
//         durationMonths: intern.durationMonths,
//         stipendInfo: intern.stipendInfo,
//         description: intern.description,
//         internshipReport: intern.internshipReport,
//         photoProof: intern.photoProof,
//         stuID: intern.stuID?._id,
//         studentName: intern.stuID?.name,
//         studentYear: intern.stuID?.year,
//     }));

//     // ✅ Send response
//     return res.json({
//       success: true,
//       data: internships,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//     });

//   } catch (err) {
//     console.error("Error in getInternships:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

//till here its commented


// get internship by stu
const getInternshipByStu = async(req , res) => {
    try{
        const internship = await Internship.find( { stuID : req.params.stuID }).populate("stuID" , "name roll branch");
        res.json(internship);
    }catch(err) {
        res.status(500).json({ error : err.message });
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


// UPdate Internship
const updateInternship = async (req, res) => {

    

    let dbSaved=false;

    // Track newly uploaded public IDs (for cleanup if DB fails)
    let newReportPublicId = null;
    let newProofPublicId = null;

    try {
        const userId = req.user.id;

        const { internshipId } = req.params;


        const existingInternship = await Internship.findById(internshipId);
        if (!existingInternship) {
            return res.status(404).json({ success: false, message: "Internship not found" });
        }

        // Authorization checks 
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

            if(existingInternship.stuID.toString() !== userId.toString()){
                return res.status(400).json({ success: false, message: "Internship does not belong to the logged in student" });
            }

        }


        const { companyName, startDate, endDate, role, durationMonths, isPaid: isPaidRaw, stipend, description } = req.body;

        // Convert strings to proper types
        const parsedDurationMonths = Number(durationMonths);
        const parsedStipend = stipend ? Number(stipend) : undefined;
        const parsedIsPaid = isPaidRaw === "true" || isPaidRaw === true;

        // Validate input using Joi
		const { error } = updateInternshipValidationSchema.validate({ companyName, startDate, endDate, role, durationMonths : parsedDurationMonths, isPaid: parsedIsPaid, stipend : parsedStipend, description }, { abortEarly: false });
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

        const updatedData = {
            companyName,
            startDate,
            endDate,
            role,
            durationMonths : parsedDurationMonths,
            description,
            stipendInfo
        };

        
        const internshipReport = req.files?.internshipReport?.[0];

        
        const photoProof = req.files?.photoProof?.[0];

        // Check file type and size
        if (internshipReport) {
            if (internshipReport.mimetype !== ALLOWED_REPORT_TYPE){
                return res.status(400).json({ success: false, message: "Internship report must be a PDF" });
            }
            if (internshipReport.size > MAX_FILE_SIZE){
                return res.status(400).json({ success: false, message: "Internship report exceeds 5MB" });
            }
        }

        if (photoProof) {
            if (!ALLOWED_PROOF_TYPES.includes(photoProof.mimetype)) {
                return res.status(400).json({ success: false, message: "Photo proof must be JPG or PNG" });
            }
            if (photoProof.size > MAX_FILE_SIZE){
                return res.status(400).json({ success: false, message: "Photo proof exceeds 5MB" });
            }
        }


        

        // Handle internshipReport upload
        if (internshipReport) {
            const reportResult = await uploadToCloudinary(internshipReport.path);
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
        if (photoProof) {
            const proofResult = await uploadToCloudinary(photoProof.path);
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
        dbSaved=true;


        return res.status(200).json({
            success: true,
            message: "Internship updated successfully",
            data: updatedInternship
        });

    } catch (err) {
        console.error("Error in updateInternship:", err);

        // If DB update failed — cleanup newly uploaded files
        if(!dbSaved){
            if (newReportPublicId) await cloudinary.uploader.destroy(newReportPublicId);
            if (newProofPublicId) await cloudinary.uploader.destroy(newProofPublicId);
        }

        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// DELETE a specific internship --make ti atomic lateron
const deleteInternship = async (req, res) => {
  try {

    const userId=req.user.id; //its ok if request is from student or admin, as both can delete or update , but user has to exist compulsory

    const { internshipId } = req.params;

    // Find internship
    const internship = await Internship.findById(internshipId);
    if (!internship) {
        return res.status(404).json({ success: false, message: "Internship not found" });
    }

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
    console.error("Error in deleteInternship controller:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


module.exports = { createInternship, getInternships , getOwnInternships , getStudentInternshipsByAdmin , getSingleInternship , updateInternship , deleteInternship };