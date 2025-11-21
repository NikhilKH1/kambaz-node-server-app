import ModulesDao from "../Modules/dao.js";
export default function ModulesRoutes(app, db) {
  const dao = ModulesDao(db);
  const findModulesForCourse = (req, res) => {
    const { courseId } = req.params;
    const modules = dao.findModulesForCourse(courseId);
    res.json(modules);
  }

  const createModuleForCourse = (req, res) => {
    const { courseId } = req.params;
    const module = {
      ...req.body,
      course: courseId,
    };
    const newModule = dao.createModule(module);
    res.status(201).json(newModule);
  }

  const deleteModule = (req, res) => {
    const { moduleId } = req.params;
    const deleted = dao.deleteModule(moduleId);
    if (!deleted) {
      res.sendStatus(404);
      return;
    }
    res.sendStatus(204);
  }

  const updateModule = async (req, res) => {
    const { moduleId } = req.params;
    const moduleUpdates = req.body;
    const updated = await dao.updateModule(moduleId, moduleUpdates);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  }
  app.put("/api/modules/:moduleId", updateModule);
  app.delete("/api/modules/:moduleId", deleteModule);
  app.post("/api/courses/:courseId/modules", createModuleForCourse);
  app.get("/api/courses/:courseId/modules", findModulesForCourse);
}
