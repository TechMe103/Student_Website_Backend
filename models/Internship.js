const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema({
    stuID : {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "Student" , 
        required : true
    } , 

    companyName : {type: String, required: true}, 

    role : {type: String, required: true}, 

    startDate: {type: Date, required:true},

    endDate: {type:Date, required:true},

    durationMonths: {
        type: Number,
        min: 1,
        max: 12,
        required: true
    },

    stipendInfo: {
        isPaid: { type: Boolean, required: true },
        stipend: { 
            type: Number,
            required: function() {
                return this.payment.isPaid === true;  // stipend is required if isPaid = true
            }
        }
    },

    description : {type: String, required: true}, 

    //certifictes, photopgrahs, and report ( pdf ) --yet to decide how to implement these

    
} , 
{timestamps: true});

module.exports = mongoose.model("Internship" , internshipSchema);