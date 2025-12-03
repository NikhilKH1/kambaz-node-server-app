import mongoose from "mongoose";
import moduleSchema from "../Modules/schema.js";
const courseSchema = new mongoose.Schema({
   _id: String,
   name: String,
   number: String,
   credits: Number,
   description: String,
   modules: [moduleSchema]
 },
 { 
   collection: "courses",
   strict: false, // Allow fields not in schema (for old courses that might have extra fields)
   versionKey: false // Disable __v field
 }
);
export default courseSchema;