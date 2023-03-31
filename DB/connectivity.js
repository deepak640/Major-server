const mongoose = require('mongoose');
const dotenv = require("dotenv")
dotenv.config({ path: "./config.env" })
mongoose.connect(process.env.D_B, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.log('Error connecting to MongoDB:', error.message);
    });
