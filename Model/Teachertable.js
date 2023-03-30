const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
    class: { type: String },
    subject: { type: String },
    start_time: { type: String },
    end_time: { type: String }
});

const daySchema = new mongoose.Schema({
    day: { type: String },
    periods: { type: [ periodSchema ] }
});

const teacherTimetableSchema = new mongoose.Schema({
    teacher_email: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    days: { type: [ daySchema ] }
});

module.exports = mongoose.model('TeacherTimetable', teacherTimetableSchema);
