const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema({
    stuID : {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "Student" , 
        required : true
    } , 

    companyName : {type: String, required: true}, 

    role : {type: String, required: true}, 

    placementType:{
        type: String,
        enum: ["Campus", "Off-Campus"],
        required: true,
    },

    higherStudies:{
        examName:{
            type: String,
            required: true,
            enum: ["GATE", "CAT", "GRE", "TOFEL", "IELTS" , "UPSC"],
        },
        score:{
            type: Number,
            required: true,
        },
        //marksheet as proof (pdf / jpeg -- which format? ) -- also how to implement these?
    }

    // LOI/joining letter/offer letter --yet to decide how to implement these

    
} , 
{timestamps: true});

module.exports = mongoose.model("Placement" , placementSchema);