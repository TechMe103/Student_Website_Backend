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

    //uncomment required:true field when cloudinary is implemented in the project

    studentPhoto : {
        type: String,
        // required: true ,
    } , 

}, 
{ timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
