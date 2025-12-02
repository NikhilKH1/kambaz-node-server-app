import { v4 as uuidv4 } from "uuid";
import model from "./model.js";

export default function AssignmentsDao() {
  const findAssignmentsForCourse = async (courseId) => {
    const assignments = await model.find({ course: courseId });
    return assignments.map((a) => a.toObject());
  };

  const findAssignmentById = async (assignmentId) => {
    const assignment = await model.findById(assignmentId);
    return assignment ? assignment.toObject() : null;
  };

  const createAssignment = async (courseId, assignment) => {
    const newAssignment = {
      _id: uuidv4(),
      course: courseId,
      availLabel: "Multiple Modules",
      ...assignment,
    };
    const created = await model.create(newAssignment);
    return created.toObject();
  };

  const updateAssignment = async (assignmentId, assignmentUpdates) => {
    await model.updateOne({ _id: assignmentId }, { $set: assignmentUpdates });
    const updated = await model.findById(assignmentId);
    return updated ? updated.toObject() : null;
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

