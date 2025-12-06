import { v4 as uuidv4 } from "uuid";
import model from "./model.js";
import EnrollmentsModel from "../Enrollments/model.js";

export default function CoursesDao() {
  const findAllCourses = async () => {
    try {
      // Get raw count from MongoDB
      const count = await model.countDocuments({});
      console.log("Total courses in collection (countDocuments):", count);
      
      // Get all courses with lean() for better performance
      const courses = await model.find({}).lean();
      console.log("Courses found (find):", courses.length);
      
      // Log sample of _id types
      if (courses.length > 0) {
        console.log("Sample course _id types:", courses.slice(0, 3).map(c => ({
          _id: c._id,
          _idType: typeof c._id,
          name: c.name
        })));
      }
      
      // Check if there's a discrepancy
      if (count !== courses.length) {
        console.warn(`⚠️ WARNING: Count mismatch! countDocuments: ${count}, find().length: ${courses.length}`);
      }
      
      return courses; // Already plain objects from lean()
    } catch (error) {
      console.error("Error in findAllCourses:", error);
      throw error;
    }
  };

  const findCoursesForEnrolledUser = async (userId) => {
    try {
      const enrollments = await EnrollmentsModel.find({ user: userId }).lean();
      const courseIds = enrollments.map((e) => e.course);
      const courses = await model.find({ _id: { $in: courseIds } }).lean();
      return courses; // Already plain objects from lean()
    } catch (error) {
      console.error("Error in findCoursesForEnrolledUser:", error);
      throw error;
    }
  };

  const createCourse = async (course) => {
    try {
      // Always generate a new UUID for new courses (ignore _id if it's "0" or empty)
      const courseId = (course._id && course._id !== "0") ? course._id : uuidv4();
      const { _id, ...courseData } = course; // Remove _id from course data
      const newCourse = { ...courseData, _id: courseId }; // Use the generated/validated _id
      const created = await model.create(newCourse);
      return created.toObject();
    } catch (error) {
      console.error("Error in createCourse:", error);
      throw error;
    }
  };

  const deleteCourse = async (courseId) => {
    try {
      await model.deleteOne({ _id: courseId });
      await EnrollmentsModel.deleteMany({ course: courseId });
      return true;
    } catch (error) {
      console.error("Error in deleteCourse:", error);
      throw error;
    }
  };

  const updateCourse = async (courseId, courseUpdates) => {
    try {
      await model.updateOne({ _id: courseId }, { $set: courseUpdates });
      const updated = await model.findById(courseId).lean();
      return updated; // Already plain object from lean()
    } catch (error) {
      console.error("Error in updateCourse:", error);
      throw error;
    }
  };
  
  return { findAllCourses, findCoursesForEnrolledUser, createCourse, deleteCourse, updateCourse };
}
