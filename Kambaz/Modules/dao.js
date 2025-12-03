import { v4 as uuidv4 } from "uuid";
import model from "../Courses/model.js";

export default function ModulesDao() {
  const updateModule = async (courseId, moduleId, moduleUpdates) => {
    try {
      const course = await model.findById(courseId);
      if (!course) {
        console.log(`Course ${courseId} not found for module update`);
        return null;
      }
      const module = course.modules.id(moduleId);
      if (!module) {
        console.log(`Module ${moduleId} not found in course ${courseId}`);
        return null;
      }
      Object.assign(module, moduleUpdates);
      await course.save();
      return module.toObject();
    } catch (error) {
      console.error("Error in updateModule:", error);
      throw error;
    }
  };

  const deleteModule = async (courseId, moduleId) => {
    const result = await model.updateOne(
      { _id: courseId },
      { $pull: { modules: { _id: moduleId } } }
    );
    return result.modifiedCount > 0;
  };

  const createModule = async (courseId, module) => {
    const newModule = { ...module, _id: module._id || uuidv4() };
    await model.updateOne(
      { _id: courseId },
      { $push: { modules: newModule } }
    );
    return newModule;
  };

  const findModulesForCourse = async (courseId) => {
    try {
      console.log(`Finding modules for course: ${courseId}`);
      
      // Try with lean first for better performance
      let course = await model.findById(courseId).lean();
      
      if (!course) {
        console.log(`Course ${courseId} not found`);
        return [];
      }
      
      console.log(`Course found: ${course.name}, modules count: ${course.modules?.length || 0}`);
      
      // If using lean(), modules are already plain objects
      if (course.modules && Array.isArray(course.modules)) {
        return course.modules; // Already plain objects from lean()
      }
      
      // Fallback: if lean() doesn't work with subdocuments, use regular query
      course = await model.findById(courseId);
      if (!course) {
        return [];
      }
      
      return course.modules ? course.modules.map((m) => m.toObject()) : [];
    } catch (error) {
      console.error("Error in findModulesForCourse:", error);
      throw error;
    }
  };

  return {
    findModulesForCourse,
    createModule,
    updateModule,
    deleteModule,
  };
}
   