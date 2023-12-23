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
    const { name, email, password, Subject, classes } = req.body;

    // Check if teacher already exists
    let existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Teacher already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new teacher
    const newTeacher = new Teacher({ name, email, password: hashedPassword,Subject });

    // Save teacher to database
    const user = await newTeacher.save();

    // Create and sign JWT token
    JWT.sign({ id: user._id }, process.env.USER_KEY, (err, token) => {
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
      return res.status(401).json({ error: 'd Invalid credentials' });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, existingTeacher.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'p Invalid credentials' });
    }

    // Create and sign JWT token
    JWT.sign({ id: existingTeacher._id }, process.env.USER_KEY, (err, token) => {
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

router.get('/timetable/:name', authenticateToken, async (req, res) => {
  const email = `${req.params.name}@gmail.com`
  try {
    const timetable = await TeacherTable.find({ teacheremail: email });
    if (timetable) {
      res.json(timetable[ 0 ]);
    } else {
      
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});


module.exports = router;
