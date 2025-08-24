const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

    name: {
        firstName : { type : String , required : true } ,
        middleName : { type : String , required : true } ,
        lastName : { type : String , required : true } ,

    },

    roll: String,
    year: String,
    div: String,
    branch: String,
    dob: Date,
    bloodGroup: String,

    currentAddress: {
        street : String , 
        city : { type : String , required : true } , 
        pincode : String 
    },

    nativeAddress: {
        street : String , 
        city : { type : String , required : true } , 
        pincode : String 
    },

    category: String,
    email: { type: String, unique: true , required: true },
    password: String, 

    mobileNo : { type: String, required: true } , 
    parentMobileNo : { type: String, required: true } ,
    
    studentPhoto : {
        type: String,
        required: true ,
    } , 

    enrollmentNo: { type: String, required: true , unique: true} , 
    studentId: { type: String, required: true , unique: true} ,

}, 
{ timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
