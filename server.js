const express = require('express');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const connectDB = require('./config/db');
require("dotenv").config();
const PORT = 5000;

const app = express();


connectDB()

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());


// Routes
app.use("/api/auth", require('./routes/authRoutes'));
app.use("/api/internship" , require("./routes/internRoutes"));
app.use("/api/achievements", require("./routes/achievementRoutes"));
app.use("/api/activities", require("./routes/activitiesRoutes"));
app.use("/api/semesterInfo", require("./routes/semInfoRoutes"));


app.get("/" , (req, res) => {
  res.send("API is running...");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
