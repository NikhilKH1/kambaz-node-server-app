import UsersDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";

export default function UserRoutes(app, db) {
  const dao = UsersDao();
  const enrollmentsDao = EnrollmentsDao(db);

  const findAllUsers = async (req, res) => {
    const { role, name } = req.query;
    if (role) {
      const users = await dao.findUsersByRole(role);
      res.json(users);
      return;
    }

    if (name) {
      const users = await dao.findUsersByPartialName(name);
      res.json(users);
      return;
    }

    const users = await dao.findAllUsers();
    res.json(users);
  };

  const requireFaculty = (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser || (currentUser.role || "").toUpperCase() !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    next();
  };

  const requireFacultyOrAdmin = (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(403);
      return;
    }
    const role = (currentUser.role || "").toUpperCase();
    if (role !== "FACULTY" && role !== "ADMIN") {
      res.sendStatus(403);
      return;
    }
    next();
  };

  const createUser = async (req, res) => {
    try {
      const user = await dao.createUser(req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };


  const deleteUser = async (req, res) => {
    try {
      const deleted = await dao.deleteUser(req.params.userId);
      if (!deleted) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };


  const findUserById = async (req, res) => {
    try {
      const user = await dao.findUserById(req.params.userId);
      if (!user) {
        res.sendStatus(404);
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const updateUserRecord = async (userId, updates, req) => {
    const updated = await dao.updateUser(userId, updates);
    if (updated && req.session["currentUser"]?._id === userId) {
      req.session["currentUser"] = updated;
    }
    return updated;
  };

  const updateUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const userUpdates = req.body;
      const updatedUser = await dao.updateUser(userId, userUpdates);
      if (!updatedUser) {
        res.sendStatus(404);
        return;
      }
      const currentUser = req.session["currentUser"];
      if (currentUser && currentUser._id === userId) {
        req.session["currentUser"] = updatedUser;
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const signup = async (req, res) => {
    const user = await dao.findUserByUsername(req.body.username);
    if (user) {
      res.status(400).json({ message: "Username already in use" });
      return;
    }
    const currentUser = await dao.createUser(req.body);
    req.session["currentUser"] = currentUser;
    res.json(currentUser);
  };

  const signin = async(req, res) => {
    const { username, password } = req.body;
    const currentUser = await dao.findUserByCredentials(username, password);
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

  const findPeopleForCourse = async (req, res) => {
    try {
      const { courseId } = req.params;
      const enrolledIds = (db.enrollments || [])
        .filter((enrollment) => enrollment.course === courseId)
        .map((enrollment) => enrollment.user);
      const allUsers = await dao.findAllUsers();
      const people = allUsers.filter((user) => enrolledIds.includes(user._id));
      res.json(people);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const createUserForCourse = async (req, res) => {
    try {
      const newUser = await dao.createUser(req.body);
      enrollmentsDao.enrollUserInCourse(newUser._id, req.params.courseId);
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const updateUserForCourse = async (req, res) => {
    try {
      const updated = await updateUserRecord(req.params.userId, req.body, req);
      if (!updated) {
        res.sendStatus(404);
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const deleteUserFromCourse = async (req, res) => {
    try {
      const deleted = await dao.deleteUser(req.params.userId);
      if (!deleted) {
        res.sendStatus(404);
        return;
      }
      enrollmentsDao.unenrollUserInCourse(
        req.params.userId,
        req.params.courseId
      );
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  app.post("/api/users", requireFacultyOrAdmin, createUser);
  app.get("/api/users", requireFacultyOrAdmin, findAllUsers);
  app.get("/api/users/:userId", requireFacultyOrAdmin, findUserById);
  app.put("/api/users/:userId", updateUser);
  app.delete("/api/users/:userId", requireFacultyOrAdmin, deleteUser);
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