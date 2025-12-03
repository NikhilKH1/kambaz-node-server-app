import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  _id: String,
  title: String,
  course: String,
  description: String,
  availLabel: String,
  availRest: String,
  due: String,
  points: Number,
}, { 
  collection: "assignments",
  strict: false, // Allow fields not in schema (for old assignments that might have extra fields)
  versionKey: false // Disable __v field
});

export default assignmentSchema;

