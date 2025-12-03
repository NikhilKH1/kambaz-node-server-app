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
    try {
      // populate doesn't work well with lean(), so we'll populate first then convert
      const enrollments = await model.find({ user: userId }).populate("course");
      return enrollments
        .filter((enrollment) => enrollment.course) // Filter out null courses
        .map((enrollment) => enrollment.course.toObject()); // Convert to plain objects
    } catch (error) {
      console.error("Error in findCoursesForUser:", error);
      throw error;
    }
  };

  const findUsersForCourse = async (courseId) => {
    try {
      const count = await model.countDocuments({ course: courseId });
      console.log(`Total enrollments for course ${courseId} (countDocuments):`, count);
      
      // populate doesn't work well with lean(), so we'll populate first then convert
      const enrollments = await model.find({ course: courseId }).populate("user");
      console.log(`Enrollments found for course ${courseId} (find):`, enrollments.length);
      
      return enrollments
        .filter((enrollment) => enrollment.user) // Filter out null users
        .map((enrollment) => enrollment.user.toObject()); // Convert to plain objects
    } catch (error) {
      console.error("Error in findUsersForCourse:", error);
      throw error;
    }
  };

  const findEnrollmentsForUser = async (userId) => {
    try {
      const count = await model.countDocuments({ user: userId });
      console.log(`Total enrollments for user ${userId} (countDocuments):`, count);
      
      const enrollments = await model.find({ user: userId }).lean();
      console.log(`Enrollments found for user ${userId} (find):`, enrollments.length);
      
      return enrollments; // Already plain objects from lean()
    } catch (error) {
      console.error("Error in findEnrollmentsForUser:", error);
      throw error;
    }
  };

  const enrollUserInCourse = async (userId, courseId) => {
    try {
      const existing = await model.findOne({ user: userId, course: courseId }).lean();
      if (existing) {
        return existing; // Already plain object from lean()
      }
      const enrollment = await model.create({
        _id: uuidv4(),
        user: userId,
        course: courseId,
        status: "ENROLLED",
        enrollmentDate: new Date(),
      });
      return enrollment.toObject();
    } catch (error) {
      console.error("Error in enrollUserInCourse:", error);
      throw error;
    }
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
