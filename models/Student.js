const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

    name: {
        firstName : { type : String , } ,
        middleName : { type : String , } ,
        lastName : { type : String , } ,
        motherName : { type : String , } ,
    },

    PRN: { type: String, }, //dont keep PRN unique:true because otherwise it gives E11000 duplicate key error collection when uploading excel file in /import studentRoute.
    studentID: { type: String, unique: true},

    email: { type: String, unique: true, },
    password: { type: String, },

    branch: {
        type: String,
        enum : ["Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical"],
    },

    year : {
        type: String,
        enum : [ "SE", "TE", "BE"],
    },


    // Store both Cloudinary URL and publicId for deletion
    studentPhoto: {
        url: { type: String },       // Cloudinary secure URL
        publicId: { type: String },  // Cloudinary public_id
    },

    dob: Date,

    bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],

    },

    currentAddress: {
        street : String , 
        city : { type : String, } , 
        pincode : String 
    },

    nativeAddress: {
        street : String , 
        city : { type : String, } , 
        nativePincode : String 
    },

    //add more categories later on after asking sir
    category: {
        type: String,
        enum : ["Open", "EWS", "EBC", "OBC", "SC", "ST", "Other"],
    },
    

    mobileNo : { type: String, } , 
    parentMobileNo : { type: String, } ,

    abcId : {type: String},
    parentEmail: {type: String},



}, 
{ timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
