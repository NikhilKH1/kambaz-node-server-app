// import { v4 as uuidv4 } from "uuid";

// export default function EnrollmentsDao(db) {
//   const withEnrollments = () => db.enrollments || [];

//   async function findCoursesForUser(userId) {
//     const enrollments = await model.find({ user: userId }).populate("course");
//     return enrollments.map((enrollment) => enrollment.course);
//   }
//   async function findUsersForCourse(courseId) {
//     const enrollments = await model.find({ course: courseId }).populate("user");
//     return enrollments.map((enrollment) => enrollment.user);
//   }
 
 
//   function enrollUserInCourse(userId, courseId) {
//     return model.create({
//       user: userId,
//       course: courseId,
//       _id: `${userId}-${courseId}`,
//     });
 

//   function unenrollUserInCourse(userId, courseId) {
//     const before = withEnrollments().length;
//     db.enrollments = withEnrollments().filter(
//       (enrollment) => !(enrollment.user === userId && enrollment.course === courseId)
//     );
//     return before !== db.enrollments.length;
//   }

//   function findEnrollmentsForUser(userId) {
//     return withEnrollments().filter((enrollment) => enrollment.user === userId);
//   }

//   function deleteEnrollmentsForUser(userId) {
//     db.enrollments = withEnrollments().filter(
//       (enrollment) => enrollment.user !== userId
//     );
//   }

//   return {
//     enrollUserInCourse,
//     unenrollUserInCourse,
//     findEnrollmentsForUser,
//     deleteEnrollmentsForUser,
//   };
// }

import { v4 as uuidv4 } from "uuid";
import model from "./model.js";

export default function EnrollmentsDao() {
  const findCoursesForUser = async (userId) => {
    const enrollments = await model.find({ user: userId }).populate("course");
    return enrollments.map((enrollment) => enrollment.course.toObject());
  };

  const findUsersForCourse = async (courseId) => {
    const enrollments = await model.find({ course: courseId }).populate("user");
    return enrollments
      .filter((enrollment) => enrollment.user) // Filter out null users
      .map((enrollment) => enrollment.user.toObject());
  };

  const findEnrollmentsForUser = async (userId) => {
    const enrollments = await model.find({ user: userId });
    return enrollments.map((e) => e.toObject());
  };

  const enrollUserInCourse = async (userId, courseId) => {
    const existing = await model.findOne({ user: userId, course: courseId });
    if (existing) {
      return existing.toObject();
    }
    const enrollment = await model.create({
      _id: uuidv4(),
      user: userId,
      course: courseId,
      status: "ENROLLED",
      enrollmentDate: new Date(),
    });
    return enrollment.toObject();
  };

  const unenrollUserFromCourse = async (userId, courseId) => {
    const result = await model.deleteOne({ user: userId, course: courseId });
    return result.deletedCount > 0;
  };

  const unenrollAllUsersFromCourse = async (courseId) => {
    await model.deleteMany({ course: courseId });
    return true;
  };

  const deleteEnrollmentsForUser = async (userId) => {
    await model.deleteMany({ user: userId });
    return true;
  };

  return {
    findCoursesForUser,
    findUsersForCourse,
    findEnrollmentsForUser,
    enrollUserInCourse,
    unenrollUserFromCourse,
    unenrollAllUsersFromCourse,
    deleteEnrollmentsForUser,
  };
}
