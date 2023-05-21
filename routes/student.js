var express = require('express');
const Student = require('../Model/Student');
const Timetable = require('../Model/TimeTable');
const Teacher = require('../Model/Teacher');
const bcrypt = require('bcryptjs')
const JWT = require('jsonwebtoken')
const authenticateToken = require('../middleware/auth');
var router = express.Router();
/* GET users listing. */
router.get('/', async (req, res) => {
    res.json({ message: "i am get route of student" });
});

// Student registration route
router.post('/register', async (req, res) => {
    const { name, classes, email, enroll_no, password } = req.body

    try {
        // Check if a student with the given email or enroll_no already exists
        const existingStudent = await Student.findOne().or([ { email }, { enroll_no } ]);

        if (existingStudent) {
            return res.status(409).json({ message: 'A student with this email or enroll_no already exists' });
        }

        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new student document in the database
        const newStudent = new Student({
            name,
            class: classes,
            email,
            enroll_no,
            password: hashedPassword
        });

        await newStudent.save();
        JWT.sign({ id: newStudent._id }, process.env.USER_KEY, (err, token) => {
            if (err) {
                res.json({ error: "somthing went wrong" })
            }
            res.json({ name, email, class: classes, auth: token })
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Student sign-in route
router.post('/signin', async (req, res) => {
    const { enroll_no, password } = req.body;

    try {
        // Check if student with the given enroll_no exists
        const student = await Student.findOne({ enroll_no });

        if (!student) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if the provided password matches the student's password
        const passwordMatch = await bcrypt.compare(password, student.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token with student's ID as payload
        JWT.sign({ id: student._id }, process.env.USER_KEY, (err, token) => {
            if (err) {
                res.json({ error: "somthing went wrong" })
            }
            res.json({
                name: student.name, email: student.email, class: student.class, auth: token
            })
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//get timetable
router.get('/timetable/:name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.params
        // Find the timetable for the student's class
        const timetable = await Timetable.findOne({ class: name })
        // If the timetable does not exist, return a 404 Not Found response
        if (!timetable) {
            return res.status(404).json({ message: 'Timetable not found' });
        }

        // Return the timetable as a response
        res.json(timetable);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
