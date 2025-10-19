const mongoose = require('mongoose');

const PersonalDetailSchema = new mongoose.Schema({

    stuID: {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "Student" , 
        required : true 
    } , 



    dob: Date,

    bloodGroup: {
        type: String,
        enum: ["A", "A+", "A-", "B", "B+", "B-", "AB+", "AB-", "O", "O+", "O-"],

    },

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

    //add more categories later on after asking sir
    category: {
        type: String,
        enum : ["Open", "EWS", "EBC", "OBC", "SC", "ST", "Other"],
    },
    

    mobileNo : { type: String, required: true } , 
    parentMobileNo : { type: String, required: true } ,

}, 
{ timestamps: true });


module.exports = mongoose.model('PersonalDetail', PersonalDetailSchema);
