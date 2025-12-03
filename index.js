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
import UserModel from "./Kambaz/Users/model.js";
const app = express();

// Log environment on startup
console.log("=== SERVER STARTUP ===");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("PORT:", process.env.PORT || "4000");
console.log("SERVER_ENV:", process.env.SERVER_ENV || "not set");
console.log("DATABASE_CONNECTION_STRING:", process.env.DATABASE_CONNECTION_STRING ? "Set" : "Not set");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "Set" : "Not set (using default)");
console.log("CLIENT_URL:", process.env.CLIENT_URL || "Not set (using defaults)");
console.log("=====================");

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";

// MongoDB connection options
const mongooseOptions = {
  // Remove deprecated options that might cause issues
};

mongoose.connect(CONNECTION_STRING, mongooseOptions)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    console.log("Database:", mongoose.connection.db?.databaseName);
    console.log("Connection state:", mongoose.connection.readyState);
    console.log("Connection string (sanitized):", CONNECTION_STRING.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // Verify connection by checking collections
    mongoose.connection.db.listCollections().toArray()
      .then(collections => {
        console.log("Available collections:", collections.map(c => c.name));
        const usersCollection = collections.find(c => c.name === "users");
        if (usersCollection) {
          console.log("Users collection found:", usersCollection.name);
        } else {
          console.warn("⚠️ Users collection not found in database!");
        }
      })
      .catch(err => console.error("Error listing collections:", err));
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    console.error("Connection string:", CONNECTION_STRING.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Detect production environment (Render sets PORT, or explicit NODE_ENV)
// Must be defined BEFORE it's used in CORS and session config
const isProduction = process.env.NODE_ENV === "production" || 
                     !!process.env.PORT || 
                     process.env.SERVER_ENV !== "development";

console.log("Production mode:", isProduction);

// Trust proxy - MUST be set BEFORE session middleware (important for Render.com)
app.set("trust proxy", 1);

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
      if (!isProduction && origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      // In production, allow all Vercel preview URLs (including custom domains)
      if (isProduction && (origin.includes(".vercel.app") || origin.includes("vercel.app"))) {
        console.log("CORS: Allowing Vercel origin:", origin);
        return callback(null, true);
      }
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log("CORS: Allowing origin from allowed list:", origin);
        callback(null, true);
      } else {
        console.log("CORS: Rejecting origin:", origin, "Allowed origins:", allowedOrigins);
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
if (isProduction) {
  sessionOptions.proxy = true; // Trust proxy (important for Render)
  sessionOptions.cookie = {
    sameSite: "none", // Required for cross-domain cookies
    secure: true, // Required for HTTPS
    httpOnly: true, // Security: prevent JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // Don't set domain - let browser handle it for cross-domain
    path: "/", // Ensure cookie is available for all paths
  };
  sessionOptions.resave = true; // Force save session even if not modified (for Render)
  console.log("Session configured for production (cross-domain cookies)");
} else {
  // Development: less strict settings
  sessionOptions.cookie = {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  };
  console.log("Session configured for development");
}

app.use(session(sessionOptions));
  
app.use(express.json({ limit: "10mb" }));

// Frontend-Backend connection test endpoint
app.get("/api/test-connection", (req, res) => {
  const origin = req.headers.origin;
  res.json({
    status: "ok",
    message: "Backend is reachable",
    origin: origin || "no origin",
    environment: isProduction ? "production" : "development",
    timestamp: new Date().toISOString(),
    corsHeaders: {
      "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || "not set",
      "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials") || "not set"
    },
    config: {
      nodeEnv: process.env.NODE_ENV || "not set",
      hasPort: !!process.env.PORT,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasDatabase: !!process.env.DATABASE_CONNECTION_STRING,
      hasClientUrl: !!process.env.CLIENT_URL
    }
  });
});

// Database connection test endpoint
app.get("/api/test-db", async (req, res) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };
    
    const dbStatus = states[connectionState] || "unknown";
    
    // Try to query the database
    let userCount = 0;
    let queryError = null;
    try {
      userCount = await UserModel.countDocuments();
    } catch (err) {
      queryError = err.message;
    }
    
    res.json({
      connectionStatus: dbStatus,
      connectionState: connectionState,
      userCount: userCount,
      queryError: queryError,
      connectionString: process.env.DATABASE_CONNECTION_STRING ? "Set (hidden)" : "Not set - using default",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connectionState: mongoose.connection.readyState
    });
  }
});

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
      (!isProduction && origin.startsWith("http://localhost:")) ||
      (isProduction && origin.includes(".vercel.app")) ||
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}`);
  console.log(`CORS: Allowing Vercel origins: ${isProduction}`);
});