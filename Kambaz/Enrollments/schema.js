import mongoose from "mongoose";
const enrollmentSchema = new mongoose.Schema(
 {
   _id: String,
   course: { type: String, ref: "CourseModel" },
   user:   { type: String, ref: "UserModel"   },
   grade: Number,
   letterGrade: String,
   enrollmentDate: Date,
   status: {
     type: String,
     enum: ["ENROLLED", "DROPPED", "COMPLETED"],
     default: "ENROLLED",
   },
 },
 { 
   collection: "enrollments",
   strict: false, // Allow fields not in schema (for old enrollments that might have extra fields)
   versionKey: false // Disable __v field
 }
);
export default enrollmentSchema;