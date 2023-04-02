var express = require('express');
var router = express.Router();
const Teacher = require('../Model/Teacher');
const Timetable = require('../Model/TimeTable');
const TeacherTimetable = require('../Model/Teachertable');
const Student = require('../Model/Student');
const authenticateToken = require('../middleware/auth');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

// timetable creation
router.post('/create', async (req, res) => {

  try {
    const className = req.body.className;

    // Check if a class with the same name already exists
    const existingClass = await Timetable.findOne({
      class: className,
    });

    if (existingClass) {
      return res.status(409).json({ error: 'A class with the same name already exists' });
    }

    const days = req.body.days;
    const startTime = req.body.start_time;
    const endTime = req.body.end_time;

    // Check for clashes in each day's timetable
    for (let i = 0; i < days.length; i++) {
      const day = days[ i ];

      for (let j = 0; j < day.periods.length; j++) {
        const period = day.periods[ j ];

        // Check if the time slot is within the overall timetable's start and end time
        if (period.start_time < startTime || period.end_time > endTime) {
          return res.status(409).json({
            error: `The time slot for ${period.subject} on ${day.day} is outside the overall timetable's time range`,
          });
        }

        // Check for clashes with periods in other classes
        const clashedPeriods = await Timetable.find({
          class: { $ne: className },
          days: {
            $elemMatch: {
              day: day.day,
              'periods.start_time': { $lt: period.end_time },
              'periods.end_time': { $gt: period.start_time },
              'periods.subject': period.subject,
            },
          },
        });

        if (clashedPeriods.length > 0) {
          const clashedClasses = clashedPeriods.map((timetable) => timetable.class);
          return res.status(409).json({
            error: `Clash detected for ${period.subject} on ${day.day} between ${className} and ${clashedClasses.join(' and ')}`,
          });
        }

        // Check for conflicts with periods in the same class
        const conflictingPeriods = day.periods.filter(
          (p) =>
            p.start_time < period.end_time &&
            p.end_time > period.start_time &&
            p.subject !== period.subject
        );

        if (conflictingPeriods.length > 0) {
          return res.status(409).json({
            error: `Conflict detected for ${period.subject} on ${day.day} within ${className}`,
          });
        }
      }
    }


    // Create the new class timetable
    const timetable = new Timetable({
      class: className,
      days: days,
      start_time: startTime,
      end_time: endTime,
    });

    await timetable.save();
    res.status(201).json(timetable._id);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// teacher timetable
router.post('/teacher-timetable', async (req, res) => {
  try {
    const teacherEmail = req.body.email;
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacherSubjects = teacher.subjects;
    const classesTimetable = await Timetable.find();
    const teacherTimetable = { class: '', days: [] };

    // iterate through each day of the week
    const weekdays = [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday' ];
    for (const day of weekdays) {
      const dayTimetable = { day: day, periods: [] };

      // iterate through each class timetable
      for (const classTimetable of classesTimetable) {
        // iterate through each day in the class timetable
        for (const classDay of classTimetable.days) {
          if (classDay.day === day) {
            // iterate through each period in the day
            for (const classPeriod of classDay.periods) {
              const subject = classPeriod.subject;
              // check if the teacher teaches the subject and add it to the timetable
              if (teacherSubjects.includes(subject)) {
                dayTimetable.periods.push({
                  class: classTimetable.class,
                  subject: subject,
                  start_time: classPeriod.start_time,
                  end_time: classPeriod.end_time,
                });
              }
            }
          }
        }
      }

      teacherTimetable.days.push(dayTimetable); // add the day's timetable to the overall teacher timetable
    }

    // create a new instance of TeacherTimetable model and save it to the database
    const newTeacherTimetable = new TeacherTimetable({
      teacher: teacher._id,
      days: teacherTimetable.days,
    });

    await newTeacherTimetable.save();

    res.json(teacherTimetable.days); // return the teacher timetable in the required format as a JSON response
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/timetables', authenticateToken, async (req, res) => {
  try {
    const _id = req.user.id
    const user = await Student.findOne({ _id });
    if (!user) {
      return res.status(404).json({ message: 'Unauthorized' });
    }
    const timetables = await Timetable.find();
    res.status(200).json(timetables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;
