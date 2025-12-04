const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
require("dotenv").config();

// const createDefaultAdmin = require('./seedAdmin');

// ✅ ADD THIS DEBUG CHECK
console.log("🔍 ENVIRONMENT VARIABLES CHECK:");
console.log("EMAIL_USER loaded:", process.env.EMAIL_USER ? "✅ YES" : "❌ NO");
console.log(
  "EMAIL_PASSWORD loaded:",
  process.env.EMAIL_PASSWORD ? "✅ YES" : "❌ NO"
);
console.log(
  "ADMIN_EMAIL loaded:",
  process.env.ADMIN_EMAIL ? "✅ YES" : "❌ NO"
);

const PORT = 5000;
const app = express();

connectDB();

// ✅ FIXED CORS - More permissive for dev
app.use(
  cors({
    origin: ["http://localhost:5173", "https://student-website-seven.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// createDefaultAdmin();  => Keep this function commented everytime server runs. Only run this function when you want to  create a new admin.


// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/internship", require("./routes/internRoutes"));
app.use("/api/achievements", require("./routes/achievementRoutes"));
app.use("/api/activities", require("./routes/activitiesRoutes"));
app.use("/api/semesterInfo", require("./routes/semInfoRoutes"));
app.use("/api/admission", require("./routes/admissionRoutes"));
app.use("/api/placement", require("./routes/PlacementRoutes"));
app.use("/api/higherStudies", require("./routes/HigherStudiesRoutes"));
app.use("/api/student", require("./routes/StudentRoutes"));

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});