const Internship = require("../models/Internship");

const createInternship = async(req , res) => {
    try{
        const internship = new Internship(req.body);
        await internship.save();
        res.status(201).json(internship);
    } catch(err) {
        res.status(500).json({ error : err.message });
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