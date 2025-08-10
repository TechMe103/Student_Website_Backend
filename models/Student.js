const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

    name: { type: String, required: true },
    roll: String,
    year: String,
    div: String,
    branch: String,
    dob: Date,
    bloodGroup: String,
    address: String,
    fees: Number,
    caste: String,
    email: { type: String, unique: true },
    password: String 

}, 
{ timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
