import { v4 as uuidv4 } from "uuid";
import model from "./model.js";
import EnrollmentsModel from "../Enrollments/model.js";

export default function CoursesDao() {
  const findAllCourses = async () => {
    const courses = await model.find();
    return courses.map((c) => c.toObject());
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
