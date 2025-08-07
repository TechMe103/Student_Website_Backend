const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema({
    stuID : {
        type : String , 
        required : true
    } , 

    companyName : String , 
    role : String , 
    duration : String ,
    certificateURL : String , 
    description : String , 
} , 
{timestamps: true});

module.exports = mongoose.model("Intership" , internshipSchema);