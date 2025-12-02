import EnrollmentsDao from "./dao.js";

export default function EnrollmentsRoutes(app, db) {
  const dao = EnrollmentsDao();

  const resolveUserId = (req, res) => {
    let { userId } = req.params;
    if (userId === "current") {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.sendStatus(401);
        return null;
      }
      userId = currentUser._id;
    }
    return userId;
  };

  app.get("/api/users/:userId/enrollments", async (req, res) => {
    const userId = resolveUserId(req, res);
    if (!userId) return;
    const enrollments = await dao.findEnrollmentsForUser(userId);
    res.json(enrollments);
  });

  app.post("/api/users/:userId/enrollments", async (req, res) => {
    const userId = resolveUserId(req, res);
    if (!userId) return;
    const { courseId } = req.body;
    if (!courseId) {
      res.status(400).json({ message: "courseId is required" });
      return;
    }
    const enrollment = await dao.enrollUserInCourse(userId, courseId);
    res.status(201).json(enrollment);
  });

  app.delete("/api/users/:userId/enrollments/:courseId", async (req, res) => {
    const userId = resolveUserId(req, res);
    if (!userId) return;
    const { courseId } = req.params;
    const deleted = await dao.unenrollUserFromCourse(userId, courseId);
    if (!deleted) {
      res.sendStatus(404);
      return;
    }
    res.sendStatus(204);
  });
}

