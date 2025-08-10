const SemesterInfo = require("../models/SemesterInfo");

const addSemInfo = async (req, res) => {
    try{
        const semInfo = new SemesterInfo(req.body);
        await semInfo.save();
        res.status(201).json(semInfo);
    } catch(err){
        res.status(500).json({ error : err.message });
    }
};

const getSemInfoByStu = async(req, res) => {
    try{
        const semData = await SemesterInfo.find({ stuID : req.params.stuID }).populate("stuID" , "name roll branch");
        res.json(semData);
    } catch(err) {
        res.status(500).json({ error : err.message });
    }
};


const updateSemInfo = async (req, res) => {
    try{
        const semInfo = await SemesterInfo.findByIdAndUpdate(req.params.id , req.body , { new : true });
        res.json(semInfo);
    } catch(err) {
        res.status(500).json({ error : err.message });
    }
};

module.exports = { addSemInfo , getSemInfoByStu , updateSemInfo };