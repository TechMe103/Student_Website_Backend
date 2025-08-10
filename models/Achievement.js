const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
    stuID: {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "Student" , 
        required : true 
    } , 

    title : String , 
    description : String , 
    date : Date , 
    certificateURL : String , 
} , 
{timestamps : true});          //create two fields createdAt & updatedAt


module.exports = mongoose.model("Achievemet" , achievementSchema);