const Activity = require("../models/Activity");

const createActivity = async(req , res) => {
    try{
        const activity = new Activity(req.body);
        await activity.save();
        res.status(201).json(activity);
    } catch(err) {
        res.status(500).json({ error : err.message });
    }
};

const getAchievementByStu = async(req, res ) => {
    try{
        const activities = await Activity.find({ stuID : req.params.stuID }).populate("stuID" , "name roll branch");
        res.json(activities);
    }catch(err) {
        res.status(500).json({ error : err.message });
    }
};

const updateActivity = async (req ,res) =>{
    try{
        const activity = await Activity.findByIdAndUpdate(req.params.id , req.body , { new : true });
        res.json(activity);
    }catch(err) {
        res.status(500).json({ error : err.message });
    }
};

const deleteActivity = async(req , res) => {
    try{
        await Activity.findByIdAndDelete(req.params.id);
        res.json({message : "Activity successfully deleted"});
    }catch(err){
        res.status(500).json({error : err.message});
    }
};

module.exports = { createActivity , getActivityByStu , updateActivity , deleteActivity };