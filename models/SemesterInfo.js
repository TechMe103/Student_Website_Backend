const mongoose = require("mongoose");

const semesterInfoSchema = new mongoose.Schema({
    stuID : {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "Student" , 
        required : true 
    } , 

    semester : {
        type : Number , 
        required : true
    } , 

    attendance : Number , 
    kts : [String] ,     //sub codes with kts
    marks : [{
        subject : String , 
        score : Number , 
        outOf : Number
    }] , 

    isDefaulter : Boolean
} , { timestamps : true });


module.exports = mongoose.model("semesterInfo" , semesterInfoSchema);