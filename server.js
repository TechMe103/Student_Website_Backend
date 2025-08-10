const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const PORT = 5000;

const app = express();


connectDB()
  .then(() => console.log("Database connected"))
  .catch(err => {
    console.error("Database connection failed", err);
    process.exit(1);
  });



// Middlewares
app.use(cors());
app.use(express.json());


// Routes
app.use("/students", require('./routes/studentRoutes'));
app.use("/achievements", require("./routes/achievementRoutes"));
app.use("/activities", require("./routes/activitiesRoutes"));
app.use("/semesterInfo", require("./routes/semInfoRoutes"));



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
