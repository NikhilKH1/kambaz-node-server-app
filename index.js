import express from 'express';
import mongoose from "mongoose";
import Hello from "./Hello.js";
import Lab5 from "./Lab5/index.js";
import cors from "cors";
import UserRoutes from "./Kambaz/Users/routes.js";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import ModulesRoutes from './Kambaz/Modules/routes.js';
import AssignmentsRoutes from './Kambaz/Assignments/routes.js';
import EnrollmentsRoutes from './Kambaz/Enrollments/routes.js';
import "dotenv/config";
import session from "express-session";
import usersData from "./Kambaz/Database/users.js";
import coursesData from "./Kambaz/Database/courses.js";
import modulesData from "./Kambaz/Database/modules.js";
import assignmentsData from "./Kambaz/Database/assignments.js";
import enrollmentsData from "./Kambaz/Database/enrollments.js";
import UserModel from "./Kambaz/Users/model.js";
import CourseModel from "./Kambaz/Courses/model.js";
import AssignmentModel from "./Kambaz/Assignments/model.js";
import EnrollmentModel from "./Kambaz/Enrollments/model.js";

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";

// Extract database name from connection string
const extractDatabaseName = (connectionString) => {
  try {
    // MongoDB connection strings: mongodb://host:port/database or mongodb+srv://user:pass@host/database
    const match = connectionString.match(/\/([^?\/]+)(\?|$)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
};

const expectedDbName = extractDatabaseName(CONNECTION_STRING);

mongoose.connect(CONNECTION_STRING).then(async () => {
  console.log("=== MONGODB CONNECTION INFO ===");
  console.log("Connected to MongoDB successfully");
  console.log("Connection string (sanitized):", CONNECTION_STRING.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  console.log("Expected database name (from connection string):", expectedDbName);
  console.log("Actual database name (from connection):", mongoose.connection.db?.databaseName);
  console.log("Connection state:", mongoose.connection.readyState);
  
  // List all databases in the cluster (if we have access)
  try {
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    console.log("\n=== ALL DATABASES IN CLUSTER ===");
    dbList.databases.forEach(db => {
      const isCurrent = db.name === mongoose.connection.db?.databaseName;
      console.log(`  ${isCurrent ? '→' : ' '} ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)${isCurrent ? ' [CURRENT]' : ''}`);
    });
  } catch (err) {
    console.log("(Cannot list all databases - may not have admin access)");
  }
  
  // Verify connection by checking collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("\n=== COLLECTIONS IN CURRENT DATABASE ===");
  console.log("Available collections:", collections.map(c => c.name));
  
  // Check document counts for each collection
  console.log("\n=== DOCUMENT COUNTS ===");
  for (const collection of collections) {
    try {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`  ${collection.name}: ${count} documents`);
    } catch (err) {
      console.log(`  ${collection.name}: Error counting - ${err.message}`);
    }
  }
  
  console.log("=====================================\n");
  
  const userCount = await UserModel.countDocuments();
  if (userCount === 0) {
    console.log("Seeding users...");
    await UserModel.insertMany(usersData);
    console.log(`Seeded ${usersData.length} users`);
  } else {
    // Check for missing users and insert them
    try {
      const existingUsernames = await UserModel.find().select('username').lean();
      const existingUsernameSet = new Set(existingUsernames.map(u => u.username));
      const missingUsers = usersData.filter(u => !existingUsernameSet.has(u.username));
      
      if (missingUsers.length > 0) {
        console.log(`Found ${missingUsers.length} missing users, inserting...`);
        await UserModel.insertMany(missingUsers, { ordered: false });
        const finalCount = await UserModel.countDocuments();
        console.log(`Inserted ${missingUsers.length} missing users. Total: ${finalCount}`);
      } else {
        console.log(`All users already exist (${userCount} total)`);
      }
    } catch (error) {
      console.error("Error inserting missing users:", error);
    }
  }
  
  // Group modules by course
  const modulesByCourse = {};
  modulesData.forEach(module => {
    const courseId = module.course;
    if (courseId) {
      if (!modulesByCourse[courseId]) {
        modulesByCourse[courseId] = [];
      }
      // Remove the 'course' field from module before embedding (it's not part of the schema)
      const { course, ...moduleData } = module;
      modulesByCourse[courseId].push(moduleData);
    }
  });
  
  // Embed modules into courses
  const coursesWithModules = coursesData.map(course => ({
    ...course,
    modules: modulesByCourse[course._id] || []
  }));
  
  const courseCount = await CourseModel.countDocuments();
  if (courseCount === 0) {
    console.log("Seeding courses with modules...");
    await CourseModel.insertMany(coursesWithModules);
    console.log(`Seeded ${coursesWithModules.length} courses with modules`);
  } else {
    // Check for missing courses and insert them
    try {
      const existingCourseIds = await CourseModel.find().select('_id').lean();
      const existingIdSet = new Set(existingCourseIds.map(c => c._id));
      const missingCourses = coursesWithModules.filter(c => !existingIdSet.has(c._id));
      
      if (missingCourses.length > 0) {
        console.log(`Found ${missingCourses.length} missing courses, inserting...`);
        await CourseModel.insertMany(missingCourses, { ordered: false });
        const finalCount = await CourseModel.countDocuments();
        console.log(`Inserted ${missingCourses.length} missing courses. Total: ${finalCount}`);
      } else {
        console.log(`All courses already exist (${courseCount} total)`);
      }
      
      // Update existing courses to include modules if they're missing
      console.log("Updating existing courses with modules...");
      for (const courseId in modulesByCourse) {
        const course = await CourseModel.findById(courseId);
        if (course) {
          const existingModuleIds = new Set((course.modules || []).map(m => m._id));
          const missingModules = modulesByCourse[courseId].filter(m => !existingModuleIds.has(m._id));
          
          if (missingModules.length > 0) {
            await CourseModel.updateOne(
              { _id: courseId },
              { $push: { modules: { $each: missingModules } } }
            );
            console.log(`Added ${missingModules.length} modules to course ${courseId}`);
          }
        }
      }
    } catch (error) {
      console.error("Error inserting/updating courses:", error);
    }
  }
  
  const assignmentCount = await AssignmentModel.countDocuments();
  if (assignmentCount === 0) {
    console.log("Seeding assignments...");
    await AssignmentModel.insertMany(assignmentsData);
    console.log(`Seeded ${assignmentsData.length} assignments`);
  } else {
    // Check for missing assignments and insert them
    try {
      const existingAssignmentIds = await AssignmentModel.find().select('_id').lean();
      const existingIdSet = new Set(existingAssignmentIds.map(a => a._id));
      const missingAssignments = assignmentsData.filter(a => !existingIdSet.has(a._id));
      
      if (missingAssignments.length > 0) {
        console.log(`Found ${missingAssignments.length} missing assignments, inserting...`);
        await AssignmentModel.insertMany(missingAssignments, { ordered: false });
        const finalCount = await AssignmentModel.countDocuments();
        console.log(`Inserted ${missingAssignments.length} missing assignments. Total: ${finalCount}`);
      } else {
        console.log(`All assignments already exist (${assignmentCount} total)`);
      }
    } catch (error) {
      console.error("Error inserting missing assignments:", error);
    }
  }
  
  const enrollmentCount = await EnrollmentModel.countDocuments();
  if (enrollmentCount === 0) {
    console.log("Seeding enrollments...");
    try {
      await EnrollmentModel.insertMany(enrollmentsData, { ordered: false });
      const newCount = await EnrollmentModel.countDocuments();
      console.log(`Seeded ${newCount} enrollments`);
    } catch (error) {
      const newCount = await EnrollmentModel.countDocuments();
      console.log(`Seeded ${newCount} enrollments (some may have failed: ${error.message})`);
    }
  } else {
    try {
      const existingIds = await EnrollmentModel.find().select('_id').lean();
      const existingIdSet = new Set(existingIds.map(e => e._id));
      const missingEnrollments = enrollmentsData.filter(e => !existingIdSet.has(e._id));
      
      if (missingEnrollments.length > 0) {
        await EnrollmentModel.insertMany(missingEnrollments, { ordered: false });
        const finalCount = await EnrollmentModel.countDocuments();
        console.log(`Inserted ${missingEnrollments.length} missing enrollments. Total: ${finalCount}`);
      } else {
        console.log(`All ${enrollmentCount} enrollments already exist`);
      }
    } catch (error) {
      console.error("Error inserting missing enrollments:", error);
    }
  }
}).catch((error) => {
  console.error("MongoDB connection error:", error);
});

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://kambaz-next-js-git-a5-nisha-murthy-dineshs-projects.vercel.app",
"https://kambaz-next-js-git-a6-nisha-murthy-dineshs-projects.vercel.app"]

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin.includes("vercel.app") || origin.includes("vercel-dns.com")) {
        return callback(null, true);
      }
      if (origin.startsWith("http://localhost")) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);
const sessionOptions = {
  secret: process.env.SESSION_SECRET || "kambaz",
  resave: false,
  saveUninitialized: false,
};
if (process.env.SERVER_ENV !== "development") {
  sessionOptions.proxy = true;
  sessionOptions.cookie = {
    sameSite: "none",
    secure: true,
    domain: process.env.SERVER_URL,
  };
}
app.use(session(sessionOptions));
app.use(express.json());

const seedDatabase = async (req, res) => {
  try {
    let results = { users: 0, courses: 0, assignments: 0, enrollments: 0, errors: [] };
    
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      try {
        await UserModel.insertMany(usersData);
        results.users = usersData.length;
        console.log(`Seeded ${usersData.length} users`);
      } catch (error) {
        results.errors.push(`Users: ${error.message}`);
        console.error("Error seeding users:", error);
      }
    } else {
      results.users = userCount;
      console.log(`Users already exist: ${userCount}`);
    }
    
    // Group modules by course for seeding
    const modulesByCourseForSeed = {};
    modulesData.forEach(module => {
      const courseId = module.course;
      if (courseId) {
        if (!modulesByCourseForSeed[courseId]) {
          modulesByCourseForSeed[courseId] = [];
        }
        const { course, ...moduleData } = module;
        modulesByCourseForSeed[courseId].push(moduleData);
      }
    });
    
    const coursesWithModulesForSeed = coursesData.map(course => ({
      ...course,
      modules: modulesByCourseForSeed[course._id] || []
    }));
    
    const courseCount = await CourseModel.countDocuments();
    if (courseCount === 0) {
      try {
        await CourseModel.insertMany(coursesWithModulesForSeed);
        results.courses = coursesWithModulesForSeed.length;
        console.log(`Seeded ${coursesWithModulesForSeed.length} courses with modules`);
      } catch (error) {
        results.errors.push(`Courses: ${error.message}`);
        console.error("Error seeding courses:", error);
      }
    } else {
      results.courses = courseCount;
      console.log(`Courses already exist: ${courseCount}`);
      
      // Update existing courses to include modules
      try {
        for (const courseId in modulesByCourseForSeed) {
          const course = await CourseModel.findById(courseId);
          if (course) {
            const existingModuleIds = new Set((course.modules || []).map(m => m._id));
            const missingModules = modulesByCourseForSeed[courseId].filter(m => !existingModuleIds.has(m._id));
            
            if (missingModules.length > 0) {
              await CourseModel.updateOne(
                { _id: courseId },
                { $push: { modules: { $each: missingModules } } }
              );
              console.log(`Added ${missingModules.length} modules to course ${courseId}`);
            }
          }
        }
      } catch (error) {
        console.error("Error updating courses with modules:", error);
      }
    }
    
    const assignmentCount = await AssignmentModel.countDocuments();
    if (assignmentCount === 0) {
      try {
        await AssignmentModel.insertMany(assignmentsData);
        results.assignments = assignmentsData.length;
        console.log(`Seeded ${assignmentsData.length} assignments`);
      } catch (error) {
        results.errors.push(`Assignments: ${error.message}`);
        console.error("Error seeding assignments:", error);
      }
    } else {
      results.assignments = assignmentCount;
      console.log(`Assignments already exist: ${assignmentCount}`);
    }
    
    const enrollmentCount = await EnrollmentModel.countDocuments();
    if (enrollmentCount === 0) {
      try {
        await EnrollmentModel.insertMany(enrollmentsData, { ordered: false });
        const newCount = await EnrollmentModel.countDocuments();
        results.enrollments = newCount;
        console.log(`Seeded ${newCount} enrollments`);
      } catch (error) {
        const newCount = await EnrollmentModel.countDocuments();
        results.enrollments = newCount;
        results.errors.push(`Enrollments: ${error.message}`);
        console.error("Error seeding enrollments:", error);
        console.log(`Inserted ${newCount} enrollments despite errors`);
      }
    } else {
      // If enrollments exist, try to insert missing ones
      try {
        const existingIds = await EnrollmentModel.find().select('_id').lean();
        const existingIdSet = new Set(existingIds.map(e => e._id));
        const missingEnrollments = enrollmentsData.filter(e => !existingIdSet.has(e._id));
        
        if (missingEnrollments.length > 0) {
          await EnrollmentModel.insertMany(missingEnrollments, { ordered: false });
          console.log(`Inserted ${missingEnrollments.length} missing enrollments`);
        }
        const finalCount = await EnrollmentModel.countDocuments();
        results.enrollments = finalCount;
        console.log(`Total enrollments: ${finalCount}`);
      } catch (error) {
        const finalCount = await EnrollmentModel.countDocuments();
        results.enrollments = finalCount;
        results.errors.push(`Enrollments: ${error.message}`);
        console.error("Error seeding enrollments:", error);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Seeding completed",
      results 
    });
  } catch (error) {
    console.error("Seeding error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

app.get("/api/seed", seedDatabase);
app.post("/api/seed", seedDatabase);

const reseedDatabase = async (req, res) => {
  try {
    console.log("Starting full reseed...");
    
    await UserModel.deleteMany({});
    await CourseModel.deleteMany({});
    await AssignmentModel.deleteMany({});
    await EnrollmentModel.deleteMany({});
    
    console.log("Cleared all collections");
    

    // Group modules by course for reseed
    const modulesByCourseForReseed = {};
    modulesData.forEach(module => {
      const courseId = module.course;
      if (courseId) {
        if (!modulesByCourseForReseed[courseId]) {
          modulesByCourseForReseed[courseId] = [];
        }
        const { course, ...moduleData } = module;
        modulesByCourseForReseed[courseId].push(moduleData);
      }
    });
    
    const coursesWithModulesForReseed = coursesData.map(course => ({
      ...course,
      modules: modulesByCourseForReseed[course._id] || []
    }));
    
    await UserModel.insertMany(usersData);
    await CourseModel.insertMany(coursesWithModulesForReseed);
    await AssignmentModel.insertMany(assignmentsData);
    await EnrollmentModel.insertMany(enrollmentsData);
    
    const results = {
      users: await UserModel.countDocuments(),
      courses: await CourseModel.countDocuments(),
      assignments: await AssignmentModel.countDocuments(),
      enrollments: await EnrollmentModel.countDocuments()
    };
    
    console.log("Reseed completed:", results);
    
    res.json({ 
      success: true, 
      message: "Reseed completed - all data cleared and reseeded",
      results 
    });
  } catch (error) {
    console.error("Reseed error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

app.get("/api/reseed", reseedDatabase);
app.post("/api/reseed", reseedDatabase);

app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running", timestamp: new Date().toISOString() });
});

// Database info endpoint
app.get("/api/db-info", async (req, res) => {
  try {
    const actualDbName = mongoose.connection.db?.databaseName;
    const expectedDbName = extractDatabaseName(CONNECTION_STRING);
    
    // List all collections and their counts
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionCounts = {};
    for (const collection of collections) {
      try {
        collectionCounts[collection.name] = await mongoose.connection.db.collection(collection.name).countDocuments();
      } catch (err) {
        collectionCounts[collection.name] = `Error: ${err.message}`;
      }
    }
    
    // Try to list all databases
    let allDatabases = [];
    try {
      const adminDb = mongoose.connection.db.admin();
      const dbList = await adminDb.listDatabases();
      allDatabases = dbList.databases.map(db => ({
        name: db.name,
        sizeMB: (db.sizeOnDisk / 1024 / 1024).toFixed(2),
        isCurrent: db.name === actualDbName
      }));
    } catch (err) {
      // No admin access
    }
    
    res.json({
      connectionState: mongoose.connection.readyState,
      databaseInfo: {
        expected: expectedDbName,
        actual: actualDbName,
        match: expectedDbName === actualDbName,
        warning: expectedDbName !== actualDbName ? "⚠️ Database name mismatch! Check your connection string." : null
      },
      allDatabases: allDatabases,
      collections: collectionCounts,
      connectionString: CONNECTION_STRING ? "Set (hidden)" : "Not set - using default",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connectionState: mongoose.connection.readyState
    });
  }
});

Lab5(app)
Hello(app)
UserRoutes(app);
CourseRoutes(app);
ModulesRoutes(app);
AssignmentsRoutes(app);
EnrollmentsRoutes(app);
app.listen(process.env.PORT || 4000)