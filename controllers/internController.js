const Internship = require("../models/Internship");
const Student = require("../models/Student");
const  uploadToCloudinary=require("../helpers/UploadToCloudinary");


const createInternship = async (req, res) => {
    try {
        const { id } = req.user;

        console.log(id);
        console.log(req.body);

        // Optional: check if student exists
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const { companyName, startDate, endDate, role, durationMonths, isPaid, stipend, description } = req.body;

        // Manual check: stipend required if isPaid is true
        if (isPaid === true && (stipend === undefined || stipend === null)) {
            return res.status(400).json({ success: false, message: "Stipend amount required if internship is paid" });
        }

        // Build stipendInfo object
        const stipendInfo = { isPaid };
        if (isPaid) stipendInfo.stipend = stipend; // only add stipend if isPaid is true

        let photoProofUrl = null;
            if (req.file) {
            photoProofUrl = await uploadToCloudinary(req.file.path);
        }

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
            photoProof: photoProofUrl,
        });

        await internship.save();
        res.status(201).json({ success: true, internship });

    } catch (err) {
        console.error("Error in createInternship controller: ", err);
        res.status(500).json({ success: false, error: err.message });
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


//update internship
const updateInternship = async(req , res) => {
    try{
        const internship = await Internship.findByIdAndUpdate(req.params.id , req.body , { new : true });
        res.json(internship);
    } catch(err) {
        res.status(500).json({ error : err.message });
    }
};


//delete internship

const deleteInternship = async(req , res) => {
    try{
        await Internship.findByIdAndDelete(req.params.id);
        res.json( { message : "Internship deleted"});
    }catch(err) {
        res.status(500).json({ error : err.message });
    }
};

module.exports = { createInternship , getInternshipByStu , updateInternship , deleteInternship };