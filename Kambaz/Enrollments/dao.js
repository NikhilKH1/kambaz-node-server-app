import { v4 as uuidv4 } from "uuid";

export default function EnrollmentsDao(db) {
  const withEnrollments = () => db.enrollments || [];

  function enrollUserInCourse(userId, courseId) {
    const existing = withEnrollments().find(
      (enrollment) => enrollment.user === userId && enrollment.course === courseId
    );
    if (existing) {
      return existing;
    }
    const newEnrollment = { _id: uuidv4(), user: userId, course: courseId };
    db.enrollments = [...withEnrollments(), newEnrollment];
    return newEnrollment;
  }

  function unenrollUserInCourse(userId, courseId) {
    const before = withEnrollments().length;
    db.enrollments = withEnrollments().filter(
      (enrollment) => !(enrollment.user === userId && enrollment.course === courseId)
    );
    return before !== db.enrollments.length;
  }

  function findEnrollmentsForUser(userId) {
    return withEnrollments().filter((enrollment) => enrollment.user === userId);
  }

  function deleteEnrollmentsForUser(userId) {
    db.enrollments = withEnrollments().filter(
      (enrollment) => enrollment.user !== userId
    );
  }

  return {
    enrollUserInCourse,
    unenrollUserInCourse,
    findEnrollmentsForUser,
    deleteEnrollmentsForUser,
  };
}
