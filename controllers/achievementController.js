const Achievement = require("../models/Achievement");

const createAchievement = async(req , res) => {
    try{
        const achievement = new Achievement(req.body);
        await achievement.save();
        res.status(201).json(achievement);
    } catch(err){
        res.status(500).json({ error : err.message });
    }
};


const getAchievementByStu = async( req, res) => {
    try{
        const achievement = await Achievement.find({ stuID : req.params.stuID }).populate("stuID" , "name roll branch");
        res.json(achievement);
    }catch(err) {
        res.status(500).json({ error : err.message });
    }
};

const updateAchievement = async(req, res) => {
    try{
        const achievement = await Achievement.findByIdAndUpdate(req.params.id , req.body , { new : true });
        res.json(achievement);
    }catch(err) {
        res.status(500).json({ error : err.message });
    }
};


const deleteAchievement = async(req, res) => {
    try{
        await Achievement.findByIdAndDelete(req.params.id);
        res.json({ message : "Achievemet successfully deleted"});
    } catch(err) {
        res.status(500).json({ error : err.message });
    }
};


module.exports = { createAchievement , getAchievementByStu , updateAchievement , deleteAchievement };