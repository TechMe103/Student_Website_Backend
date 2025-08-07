const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    stuID : {
        type : String , 
        required : true 
    } , 

    type: { type : String , enum : ["Commitee" , "Sports" , "Hackathon"]  , required : true} , 
    title : String , 
    description : String , 
    date : Date , 
    certificateURL : String , 
} , { timestamps : true});

module.exports = mongoose.model("Activity"  , activitySchema);