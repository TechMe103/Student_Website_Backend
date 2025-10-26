const express = require('express');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const connectDB = require('./config/db');
require("dotenv").config();

// const createDefaultAdmin = require('./seedAdmin');

const PORT = 5000;

const app = express();

connectDB()

// Middlewares
app.use(cors());
app.use(express.json({limit: "50mb",}));
app.use(express.urlencoded({limit: "50mb", extended: true}));
app.use(cookieParser());

// createDefaultAdmin();

// Routes
app.use("/api/auth", require('./routes/authRoutes'));
app.use("/api/internship" , require("./routes/internRoutes"));
app.use("/api/achievements", require("./routes/achievementRoutes"));
app.use("/api/activities", require("./routes/activitiesRoutes"));
app.use("/api/semesterInfo", require("./routes/semInfoRoutes"));
app.use("/api/admission", require("./routes/admissionRoutes"));
app.use("/api/placement", require("./routes/PlacementRoutes"));
app.use("/api/higherStudies", require("./routes/HigherStudiesRoutes"));
app.use("/api/student", require("./routes/StudentRoutes"));


app.get("/" , (req, res) => {
  res.send("API is running...");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
