const mongoose = require("mongoose");

const admissionSchema = new mongoose.Schema({

    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    rollno: String,
    year: String,     // fy/sy/ty
    div: String,
    course: { type: String, required: true },
    admissionDate: { type: Date, default: Date.now },
    
    status: { 
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    fees: { type: Number, required: true } , 
    isFeesPaid : {
        type : Boolean ,
        default : false
    } , 

    isScholarshipApplied: {
        type: Boolean,
        default: false
    } , 

    //academic yr => 2023-2024
    academicYear: {
        type: String,
        required: true
    } 
});

admissionSchema.statics.getUnpaidStudents = function (){
    return this.find({ isFeesPaid: false }).populate("studentId");
};

module.exports = mongoose.model("Admission", admissionSchema);
