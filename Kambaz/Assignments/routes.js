import AssignmentsDao from "./dao.js";

export default function AssignmentsRoutes(app, db) {
  const dao = AssignmentsDao();

  const requireFaculty = (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser || (currentUser.role || "").toUpperCase() !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    next();
  };

  app.get("/api/courses/:courseId/assignments", async (req, res) => {
    const assignments = await dao.findAssignmentsForCourse(req.params.courseId);
    res.json(assignments);
  });

  app.get("/api/assignments/:assignmentId", async (req, res) => {
    const assignment = await dao.findAssignmentById(req.params.assignmentId);
    if (!assignment) {
      res.sendStatus(404);
      return;
    }
    res.json(assignment);
  });

  app.post(
    "/api/courses/:courseId/assignments",
    requireFaculty,
    async (req, res) => {
      const newAssignment = await dao.createAssignment(
        req.params.courseId,
        req.body
      );
      res.status(201).json(newAssignment);
    }
  );

  app.put("/api/assignments/:assignmentId", requireFaculty, async (req, res) => {
    const updated = await dao.updateAssignment(req.params.assignmentId, req.body);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  });

  app.delete(
    "/api/assignments/:assignmentId",
    requireFaculty,
    async (req, res) => {
      const deleted = await dao.deleteAssignment(req.params.assignmentId);
      if (!deleted) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(204);
    }
  );
}

