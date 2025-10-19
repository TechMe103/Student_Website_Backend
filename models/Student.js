const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

    name: {
        firstName : { type : String , required : true } ,
        middleName : { type : String , required : true } ,
        lastName : { type : String , required : true } ,
    },

    PRN: { type: String, required: true , unique: true} , 
    studentID: { type: String, required: true , unique: true} ,

    email: { type: String, unique: true , required: true },
    password: { type: String,  required: true },

    branch: {
        type: String,
        enum : ["Computer", "IT", "AIDS", "Civil", "Chemical", "Mechanical"],
    },

    year : {
        type: String,
        enum : [ "SE", "TE", "BE"],
    },

    //uncomment required:true field when cloudinary is implemented in the project

    // Store both Cloudinary URL and publicId for deletion
    studentPhoto: {
        url: { type: String },       // Cloudinary secure URL
        publicId: { type: String },  // Cloudinary public_id
        // required: true,          // uncomment if photo is mandatory
    }

}, 
{ timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
