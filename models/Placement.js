const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema({
    stuID : {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "Student" , 
        required : true
    } , 

    
    

    // Placement info (only required if isPlacement = true)
    placementInfo: {
        isPlacement: {
            type: Boolean,
            required: true
        },
        companyName: {
            type: String,
            required: function () {
                return this.placementInfo?.isPlacement === true;
            }
        },
        role: {
            type: String,
            required: function () {
                return this.placementInfo?.isPlacement === true;
            }
        },
        placementType: {
            type: String,
            enum: ["Campus", "Off-Campus"],
            required: function () {
                return this.placementInfo?.isPlacement === true;
            }
        }
    },

    // Higher Studies info (only required if isPlacement = false)
    higherStudies: {
        isHigherStudies: {
            type: Boolean,
            required: true
        },
        examName: {
            type: String,
            enum: ["GATE", "CAT", "GRE", "TOFEL", "IELTS", "UPSC"],
            required: function () {
                return this.higherStudies?.isHigherStudies === true;
            }
        },
        score: {
            type: Number,
            required: function () {
                return this.higherStudies?.isHigherStudies === true;
            }
        }
        //marksheet as proof (pdf / jpeg -- which format? ) -- also how to implement these?
    },


    // LOI/joining letter/offer letter --yet to decide how to implement these

    
} , 
{timestamps: true});

module.exports = mongoose.model("Placement" , placementSchema);