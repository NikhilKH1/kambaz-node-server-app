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
}, { collection: "assignments" });

export default assignmentSchema;

