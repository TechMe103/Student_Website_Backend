const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    stuID : {
        type : String , 
        required : true , 
        unique : true
    } , 

    name : String , 
    rollno : String , 
    year : String , 
    div : String , 
    branch : String ,
    dob : Date , 
    bloodGroup :String , 
    fees : Number , 
    caste : String , 
    email : String , 
    password : String , 
} , 
{timestamps : true});

module.exports = mongoose.model("student" , studentSchema);
