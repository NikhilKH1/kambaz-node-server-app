import AssignmentsDao from "./dao.js";

export default function AssignmentsRoutes(app, db) {
  const dao = AssignmentsDao(db);

  const requireFaculty = (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser || (currentUser.role || "").toUpperCase() !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    next();
  };

  app.get("/api/courses/:courseId/assignments", (req, res) => {
    const assignments = dao.findAssignmentsForCourse(req.params.courseId);
    res.json(assignments);
  });

  app.get("/api/assignments/:assignmentId", (req, res) => {
    const assignment = dao.findAssignmentById(req.params.assignmentId);
    if (!assignment) {
      res.sendStatus(404);
      return;
    }
    res.json(assignment);
  });

  app.post(
    "/api/courses/:courseId/assignments",
    requireFaculty,
    (req, res) => {
      const newAssignment = dao.createAssignment(
        req.params.courseId,
        req.body
      );
      res.status(201).json(newAssignment);
    }
  );

  app.put("/api/assignments/:assignmentId", requireFaculty, (req, res) => {
    const updated = dao.updateAssignment(req.params.assignmentId, req.body);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  });

  app.delete(
    "/api/assignments/:assignmentId",
    requireFaculty,
    (req, res) => {
      const deleted = dao.deleteAssignment(req.params.assignmentId);
      if (!deleted) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(204);
    }
  );
}

