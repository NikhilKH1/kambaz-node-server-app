import "dotenv/config";
import session from "express-session";
import express from 'express';
import mongoose from "mongoose";
import Hello from "./Hello.js"
import Lab5 from "./Lab5/index.js";
import cors from "cors";
import db from "./Kambaz/Database/index.js";
import UserRoutes from "./Kambaz/Users/routes.js";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import AssignmentsRoutes from "./Kambaz/Assignments/routes.js";
import ModulesRoutes from "./Kambaz/Modules/routes.js";
import EnrollmentsRoutes from "./Kambaz/Enrollments/routes.js";
const app = express();

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";
mongoose.connect(CONNECTION_STRING)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3006", "http://localhost:3008", "https://kambaz-next-js-git-a5-nikhil-kundalli-harishs-projects.vercel.app", "https://kambaz-next-js-git-a6-nikhil-kundalli-harishs-projects.vercel.app"];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      // In development, allow all localhost origins
      if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      // In production, allow all Vercel preview URLs
      if (process.env.NODE_ENV === "production" && origin.includes(".vercel.app")) {
        return callback(null, true);
      }
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

const sessionOptions = {
  secret: process.env.SESSION_SECRET || "kambaz",
  resave: false,
  saveUninitialized: false,
  name: "kambaz.sid", // Custom session name
};

// Production session configuration for cross-domain cookies
if (process.env.NODE_ENV === "production" || process.env.SERVER_ENV !== "development") {
  sessionOptions.proxy = true; // Trust proxy (important for Render)
  sessionOptions.cookie = {
    sameSite: "none", // Required for cross-domain cookies
    secure: true, // Required for HTTPS
    httpOnly: true, // Security: prevent JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // Don't set domain - let browser handle it for cross-domain
  };
} else {
  // Development: less strict settings
  sessionOptions.cookie = {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  };
}

app.use(session(sessionOptions));
  
app.use(express.json({ limit: "10mb" }));

// Trust proxy - important for Render.com
app.set("trust proxy", 1);

UserRoutes(app, db);
CourseRoutes(app, db);
AssignmentsRoutes(app, db);
ModulesRoutes(app, db);
EnrollmentsRoutes(app, db);
Hello(app)
Lab5(app);

// Error handling middleware - ensure CORS headers are set even on errors
app.use((err, req, res, next) => {
  // Set CORS headers
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = 
      process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:") ||
      process.env.NODE_ENV === "production" && origin.includes(".vercel.app") ||
      allowedOrigins.includes(origin);
    
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }
  
  console.error("Error:", err);
  res.status(err.status || 500).json({ 
    message: err.message || "Internal server error" 
  });
});

app.listen(process.env.PORT || 4000)