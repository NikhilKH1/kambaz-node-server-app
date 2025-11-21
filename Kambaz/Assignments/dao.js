import { v4 as uuidv4 } from "uuid";

export default function AssignmentsDao(db) {
  const withAssignments = () => db.assignments || [];

  const findAssignmentsForCourse = (courseId) =>
    withAssignments().filter((assignment) => assignment.course === courseId);

  const findAssignmentById = (assignmentId) =>
    withAssignments().find((assignment) => assignment._id === assignmentId);

  const createAssignment = (courseId, assignment) => {
    const newAssignment = {
      _id: uuidv4(),
      course: courseId,
      availLabel: "Multiple Modules",
      ...assignment,
    };
    db.assignments = [...withAssignments(), newAssignment];
    return newAssignment;
  };

  const updateAssignment = (assignmentId, assignmentUpdates) => {
    const assignment = findAssignmentById(assignmentId);
    if (!assignment) {
      return null;
    }
    Object.assign(assignment, assignmentUpdates);
    return assignment;
  };

  const deleteAssignment = (assignmentId) => {
    const before = withAssignments().length;
    db.assignments = withAssignments().filter(
      (assignment) => assignment._id !== assignmentId
    );
    return before !== db.assignments.length;
  };

  return {
    findAssignmentsForCourse,
    findAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}

