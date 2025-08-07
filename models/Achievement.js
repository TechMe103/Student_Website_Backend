const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
    stuID: {
        type : String , 
        required : true 
    } , 

    title : String , 
    description : String , 
    date : Date , 
    certificateURL : String , 
} , 
{timestamps : true});


module.exports = mongoose.model("Achievemet" , achievementSchema);