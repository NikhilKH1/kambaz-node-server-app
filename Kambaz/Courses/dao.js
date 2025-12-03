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
    const enrollments = await EnrollmentsModel.find({ user: userId });
    const courseIds = enrollments.map((e) => e.course);
    const courses = await model.find({ _id: { $in: courseIds } });
    return courses.map((c) => c.toObject());
  };

  const createCourse = async (course) => {
    const newCourse = { ...course, _id: course._id || uuidv4() };
    const created = await model.create(newCourse);
    return created.toObject();
  };

  const deleteCourse = async (courseId) => {
    await model.deleteOne({ _id: courseId });
    await EnrollmentsModel.deleteMany({ course: courseId });
    return true;
  };

  const updateCourse = async (courseId, courseUpdates) => {
    await model.updateOne({ _id: courseId }, { $set: courseUpdates });
    const updated = await model.findById(courseId);
    return updated ? updated.toObject() : null;
  };
  
  return { findAllCourses, findCoursesForEnrolledUser, createCourse, deleteCourse, updateCourse };
}
