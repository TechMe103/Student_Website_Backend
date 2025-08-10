const Student = require("../models/Student");

const registerStu = async (req , res) => {
    try{
        const student = new Student(req.body);
        await student.save();
        res.status(201).json(student);
    } catch(err) {
        res.status(500).json({ error : err.message });
    }
};


const getStuId = async (req , res) => {
    try{
        const student = await Student.findOne({ stuID : req.params.id });
        if( !student ) {
            return res.status(404).json({message : "Student not found"});
            res.json(student);
        }

    }catch(err){
        res.status(500).json({ error : err.message });
    }
};

module.exports = { registerStu , getStuId };

