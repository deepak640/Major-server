const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String },
    password: { type: String },
    subjects: { type: String },
    timetable: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
});

// generating token
module.exports = mongoose.model('Teacher', teacherSchema);
