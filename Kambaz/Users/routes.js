import UsersDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";

export default function UserRoutes(app, db) {
  const dao = UsersDao(db);
  const enrollmentsDao = EnrollmentsDao(db);

  const requireFaculty = (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser || (currentUser.role || "").toUpperCase() !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    next();
  };

  const createUser = (req, res) => {
    const newUser = dao.createUser(req.body);
    res.status(201).json(newUser);
  };

  const deleteUser = (req, res) => {
    const deleted = dao.deleteUser(req.params.userId);
    if (!deleted) {
      res.sendStatus(404);
      return;
    }
    enrollmentsDao.deleteEnrollmentsForUser(req.params.userId);
    res.sendStatus(204);
  };

  const findAllUsers = (req, res) => {
    res.json(dao.findAllUsers());
  };

  const findUserById = (req, res) => {
    const user = dao.findUserById(req.params.userId);
    if (!user) {
      res.sendStatus(404);
      return;
    }
    res.json(user);
  };

  const updateUserRecord = (userId, updates, req) => {
    const updated = dao.updateUser(userId, updates);
    if (updated && req.session["currentUser"]?._id === userId) {
      req.session["currentUser"] = updated;
    }
    return updated;
  };

  const updateUser = (req, res) => {
    const updated = updateUserRecord(req.params.userId, req.body, req);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  };

  const signup = (req, res) => {
    const user = dao.findUserByUsername(req.body.username);
    if (user) {
      res.status(400).json({ message: "Username already in use" });
      return;
    }
    const currentUser = dao.createUser(req.body);
    req.session["currentUser"] = currentUser;
    res.json(currentUser);
  };

  const signin = (req, res) => {
    const { username, password } = req.body;
    const currentUser = dao.findUserByCredentials(username, password);
    if (currentUser) {
      req.session["currentUser"] = currentUser;
      res.json(currentUser);
    } else {
      res.status(401).json({ message: "Unable to login. Try again later." });
    }
  };

  const signout = (req, res) => {
    req.session.destroy(() => {
      res.sendStatus(200);
    });
  };

  const profile = (req, res) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    res.json(currentUser);
  };

  const findPeopleForCourse = (req, res) => {
    const { courseId } = req.params;
    const enrolledIds = (db.enrollments || [])
      .filter((enrollment) => enrollment.course === courseId)
      .map((enrollment) => enrollment.user);
    const people = dao
      .findAllUsers()
      .filter((user) => enrolledIds.includes(user._id));
    res.json(people);
  };

  const createUserForCourse = (req, res) => {
    const newUser = dao.createUser(req.body);
    enrollmentsDao.enrollUserInCourse(newUser._id, req.params.courseId);
    res.status(201).json(newUser);
  };

  const updateUserForCourse = (req, res) => {
    const updated = updateUserRecord(req.params.userId, req.body, req);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  };

  const deleteUserFromCourse = (req, res) => {
    const deleted = dao.deleteUser(req.params.userId);
    if (!deleted) {
      res.sendStatus(404);
      return;
    }
    enrollmentsDao.unenrollUserInCourse(
      req.params.userId,
      req.params.courseId
    );
    res.sendStatus(204);
  };

  app.post("/api/users", requireFaculty, createUser);
  app.get("/api/users", requireFaculty, findAllUsers);
  app.get("/api/users/:userId", requireFaculty, findUserById);
  app.put("/api/users/:userId", updateUser);
  app.delete("/api/users/:userId", requireFaculty, deleteUser);
  app.post("/api/users/signup", signup);
  app.post("/api/users/signin", signin);
  app.post("/api/users/signout", signout);
  app.post("/api/users/profile", profile);
  app.get("/api/users/profile", profile);

  app.get("/api/courses/:courseId/people", findPeopleForCourse);
  app.post(
    "/api/courses/:courseId/people",
    requireFaculty,
    createUserForCourse
  );
  app.put(
    "/api/courses/:courseId/people/:userId",
    requireFaculty,
    updateUserForCourse
  );
  app.delete(
    "/api/courses/:courseId/people/:userId",
    requireFaculty,
    deleteUserFromCourse
  );
}