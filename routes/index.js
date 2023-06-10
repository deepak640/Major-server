var express = require('express');
var router = express.Router();
const Teacher = require('../Model/Teacher');
const Timetable = require('../Model/TimeTable');
const TeacherTimetable = require('../Model/Teachertable');
const Student = require('../Model/Student');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
// Admin Signin 
router.post('/admin/login', (req, res) => {
  // Perform admin authentication logic here
  const generateAdminToken = () => {
    const adminPayload = {
      isAdmin: true
    };
    if (req.body.email === 'deepak@gmail.com' && req.body.password === 'admin123')
      return jwt.sign(adminPayload, process.env.ADMIN_KEY);
  };
  // If authentication is successful, generate the admin token
  const adminToken = generateAdminToken();
  // Return the admin token as a response
  res.json({ auth: adminToken });
});

// timetable creation
router.post('/create', async (req, res) => {
  const { className, days, start_time, end_time } = req.body
  if (!className || !days || !start_time || !end_time) {
    return res.status(400).json({ error: "please fill data" })
  }
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

    // Iterate through each day of the week
    const weekdays = [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday' ];
    for (const day of weekdays) {
      const dayTimetable = { day: day, periods: [] };

      // Iterate through each class timetable
      for (const classTimetable of classesTimetable) {
        // Iterate through each day in the class timetable
        for (const classDay of classTimetable.days) {
          if (classDay.day === day) {
            // Iterate through each period in the day
            for (const classPeriod of classDay.periods) {
              const subject = classPeriod.subject;

              // Check if the teacher teaches the subject and if it's not already assigned
              if (teacherSubjects.includes(subject) && !classPeriod.teacher) {
                // Assign the teacher to the class timetable and store class details in teacher timetable
                classPeriod.teacher = teacherEmail;
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

      teacherTimetable.days.push(dayTimetable); // Add the day's timetable to the overall teacher timetable
    }

    // Save the modified class timetables with teacher assignments
    for (const classTimetable of classesTimetable) {
      await classTimetable.save();
    }

    // Create a new instance of TeacherTimetable model and save it to the database
    const newTeacherTimetable = new TeacherTimetable({
      teacheremail: teacherEmail,
      teacher: teacher._id,
      days: teacherTimetable.days,
    });

    await newTeacherTimetable.save();

    res.json(teacherTimetable); // Return the teacher timetable in the required format as a JSON response
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/timetables', authenticateToken, async (req, res) => {
  try {
    const classes = await Timetable.find();
    const classArray = Object.values(classes);

    const teachers = await TeacherTimetable.find();
    const teacherArray = Object.values(teachers);

    const mergedData = [ ...classArray, ...teacherArray ].reduce((acc, item, index) => {
      acc[ index ] = item;
      return acc;
    }, {});

    res.status(200).json(mergedData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/Userrecord', async (req, res) => {
  try {
    const student = await Student.find()
    const teacher = await Teacher.find()
    res.status(200).json({ student, teacher })
  } catch (error) {
    console.log(error)
  }
})

router.post('/deleteUser', async (req, res) => {
  const { accountType, email } = req.body;

  try {
    if (accountType === 'Student') {
      await Student.deleteOne({ email: email });
    } else if (accountType === 'Teacher') {
      await Teacher.deleteOne({ email: email });
    } else {
      return res.status(400).json({ error: 'Invalid account type.' });
    }
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/deleteTable', async (req, res) => {
  const { type, name } = req.body;

  try {
    if (type === 'class') {
      await Timetable.deleteOne({ class: name });
    } else if (type === 'Teacher') {
      await TeacherTimetable.deleteOne({ teacheremail: name });
    } else {
      return res.status(400).json({ error: 'Invalid account type.' });
    }
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/Tablerecord', async (req, res) => {
  try {
    const student = await Timetable.find()
    const teacher = await TeacherTimetable.find()
    res.json({ student, teacher })
  } catch (error) {
    console.log(error)
  }
})




module.exports = router;