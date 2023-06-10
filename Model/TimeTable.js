const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
    subject: { type: String },
    teacher: { type: String },
    start_time: { type: String },
    end_time: { type: String }
});

const daySchema = new mongoose.Schema({
    day: { type: String },
    periods: { type: [ periodSchema ] }
});

const timetableSchema = new mongoose.Schema({
    class: { type: String },
    days: { type: [ daySchema ] },
    start_time: { type: String },
    end_time: { type: String }
});

module.exports = mongoose.model('Timetable', timetableSchema);