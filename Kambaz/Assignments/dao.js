import { v4 as uuidv4 } from "uuid";
import model from "./model.js";

export default function AssignmentsDao() {
  const findAssignmentsForCourse = async (courseId) => {
    try {
      const count = await model.countDocuments({ course: courseId });
      console.log(`Total assignments for course ${courseId} (countDocuments):`, count);
      
      const assignments = await model.find({ course: courseId }).lean();
      console.log(`Assignments found for course ${courseId} (find):`, assignments.length);
      
      return assignments; // Already plain objects from lean()
    } catch (error) {
      console.error("Error in findAssignmentsForCourse:", error);
      throw error;
    }
  };

  const findAssignmentById = async (assignmentId) => {
    try {
      const assignment = await model.findById(assignmentId).lean();
      return assignment; // Already plain object from lean()
    } catch (error) {
      console.error("Error in findAssignmentById:", error);
      throw error;
    }
  };

  const createAssignment = async (courseId, assignment) => {
    try {
      const newAssignment = {
        _id: uuidv4(),
        course: courseId,
        availLabel: "Multiple Modules",
        ...assignment,
      };
      const created = await model.create(newAssignment);
      return created.toObject();
    } catch (error) {
      console.error("Error in createAssignment:", error);
      throw error;
    }
  };

  const updateAssignment = async (assignmentId, assignmentUpdates) => {
    try {
      await model.updateOne({ _id: assignmentId }, { $set: assignmentUpdates });
      const updated = await model.findById(assignmentId).lean();
      return updated; // Already plain object from lean()
    } catch (error) {
      console.error("Error in updateAssignment:", error);
      throw error;
    }
  };

  const deleteAssignment = async (assignmentId) => {
    const result = await model.deleteOne({ _id: assignmentId });
    return result.deletedCount > 0;
  };

  return {
    findAssignmentsForCourse,
    findAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}

