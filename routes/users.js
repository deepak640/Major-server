var express = require('express');
const Teacher = require('../Model/Teacher');
const TeacherTable = require('../Model/Teachertable');
const bcrypt = require('bcryptjs')
const JWT = require('jsonwebtoken')
const authenticateToken = require('../middleware/auth');
var router = express.Router();
/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

/* Registering teachers */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, subjects, classes } = req.body;

    // Check if teacher already exists
    let existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Teacher already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new teacher
    const newTeacher = new Teacher({ name, email, password: hashedPassword, subjects });

    // Save teacher to database
    const user = await newTeacher.save();

    // Create and sign JWT token
    JWT.sign({ id: user._id }, process.env.KEY, (err, token) => {
      if (err) {
        res.json({ error: "somthing went wrong" })
      }
      res.json({ Number: user.class, name: user.name, Email: user.email, auth: token })
    })

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});
/* Singing in  teachers */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if teacher exists
    let existingTeacher = await Teacher.findOne({ email });
    if (!existingTeacher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, existingTeacher.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create and sign JWT token
    JWT.sign({ id: existingTeacher._id }, process.env.KEY, (err, token) => {
      if (err) {
        res.json({ error: "couldnt generate id" })
      }
      res.json({ Number: existingTeacher.class, subject: existingTeacher.subjects, Email: existingTeacher.email, auth: token })
    })
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

/* add-subjects-classes */
router.post('/teachers/add-subjects-classes', authenticateToken, async (req, res) => {
  const { subjects, classes } = req.body;
  const _id = req.user.id;

  try {
    // Find the teacher by their email address
    const teacher = await Teacher.findOne({ _id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if the new subjects and classes already exist in the teacher's array
    const existingSubjects = teacher.subjects.filter(subject => subjects.includes(subject));
    const existingClasses = teacher.classes.filter(cls => classes.includes(cls));

    // If there are any existing subjects or classes, return an error message
    if (existingSubjects.length > 0 || existingClasses.length > 0) {
      const existingItems = [ existingSubjects, existingClasses ];
      return res.status(400).json({ message: `The following items already exist for this teacher: ${existingItems.join(', ')}` });
    }

    // Push the new subjects and classes to the teacher's array
    teacher.subjects.push(subjects);
    teacher.classes.push(classes);

    // Save the updated teacher to the database
    await teacher.save();

    return res.status(200).json({ message: 'Subjects and classes added to teacher' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/timetable', authenticateToken, async (req, res) => {
  const id = req.user.id
  try {
    const timetable = await TeacherTable.find({ teacher: id });
    res.json(timetable[ 0 ]);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
module.exports = router;
