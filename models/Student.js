const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

    name: {
        firstName : { type : String , } ,
        middleName : { type : String , } ,
        lastName : { type : String , } ,
    },

    PRN: { type: String, } , 
    studentID: { type: String, unique: true} ,

    email: { type: String, unique: true , },
    password: { type: String,  },

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
        enum: ["A", "A+", "A-", "B", "B+", "B-", "AB+", "AB-", "O", "O+", "O-"],

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


}, 
{ timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
