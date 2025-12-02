import { v4 as uuidv4 } from "uuid";
import model from "../Courses/model.js";

export default function ModulesDao() {
  const updateModule = async (courseId, moduleId, moduleUpdates) => {
    const course = await model.findById(courseId);
    if (!course) {
      return null;
    }
    const module = course.modules.id(moduleId);
    if (!module) {
      return null;
    }
    Object.assign(module, moduleUpdates);
    await course.save();
    return module.toObject();
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
    const course = await model.findById(courseId);
    if (!course) {
      return [];
    }
    return course.modules.map((m) => m.toObject());
  };

  return {
    findModulesForCourse,
    createModule,
    updateModule,
    deleteModule,
  };
}
   