import { v4 as uuidv4 } from "uuid";
export default function ModulesDao(db) {

  function updateModule(moduleId, moduleUpdates) {
    const { modules } = db;
    const module = modules.find((module) => module._id === moduleId);
    if (!module) {
      return null;
    }
    Object.assign(module, moduleUpdates);
    return module;
  }

  function deleteModule(moduleId) {
    const { modules } = db;
    const before = modules.length;
    db.modules = modules.filter((module) => module._id !== moduleId);
    return before !== db.modules.length;
  }

  function createModule(module) {
    const newModule = { ...module, _id: uuidv4(), lessons: module.lessons || [] };
    db.modules = [...db.modules, newModule];
    return newModule;
  }

  function findModulesForCourse(courseId) {
    const { modules } = db;
    return modules.filter((module) => module.course === courseId);
  }
  return {
    findModulesForCourse,
    createModule,
    updateModule,
    deleteModule,
  };
}
   