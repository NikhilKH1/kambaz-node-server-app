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
    try {
      // Trim whitespace from inputs
      const trimmedUsername = (req.body.username || "").trim();
      const trimmedPassword = (req.body.password || "").trim();
      
      if (!trimmedUsername || !trimmedPassword) {
        res.status(400).json({ message: "Username and password are required" });
        return;
      }
      
      const user = await dao.findUserByUsername(trimmedUsername);
      if (user) {
        res.status(400).json({ message: "Username already in use" });
        return;
      }
      
      // Create user with trimmed values
      const userData = {
        ...req.body,
        username: trimmedUsername,
        password: trimmedPassword
      };
      
      console.log("Signup - Creating user:", trimmedUsername);
      const currentUser = await dao.createUser(userData);
      console.log("Signup - User created:", currentUser.username, "ID:", currentUser._id);
      
      req.session["currentUser"] = currentUser;
      // Explicitly save session to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          res.status(500).json({ message: "Failed to create session" });
          return;
        }
        res.json(currentUser);
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: error.message || "Unable to sign up. Try again later." });
    }
  };

  const signin = async(req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        res.status(400).json({ message: "Username and password are required" });
        return;
      }
      
      // Trim whitespace from inputs
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      
      console.log("Signin attempt - Username:", trimmedUsername, "Password length:", trimmedPassword.length);
      
      const currentUser = await dao.findUserByCredentials(trimmedUsername, trimmedPassword);
      
      if (currentUser) {
        console.log("User found:", currentUser.username, "Role:", currentUser.role);
        req.session["currentUser"] = currentUser;
        // Explicitly save session to ensure it's persisted
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            res.status(500).json({ message: "Failed to create session" });
            return;
          }
          console.log("Signin successful for:", currentUser.username);
          res.json(currentUser);
        });
      } else {
        // Check if username exists at all
        const userExists = await dao.findUserByUsername(trimmedUsername);
        console.log("Signin failed - Username exists:", !!userExists);
        if (userExists) {
          console.log("Password mismatch for user:", trimmedUsername);
        } else {
          console.log("Username not found:", trimmedUsername);
        }
        res.status(401).json({ message: "Invalid username or password" });
      }
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ message: error.message || "Unable to login. Try again later." });
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
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    res.json(currentUser);
  };

  const findPeopleForCourse = async (req, res) => {
    try {
      const { courseId } = req.params;
      const users = await enrollmentsDao.findUsersForCourse(courseId);
      res.json(users);
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

  // Debug endpoint to check users (remove in production)
  app.get("/api/users/debug/list", async (req, res) => {
    try {
      const users = await dao.findAllUsers();
      // Return usernames and password lengths (not actual passwords) for debugging
      const safeUsers = users.map(u => ({
        _id: u._id,
        username: u.username,
        passwordLength: u.password ? u.password.length : 0,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName
      }));
      res.json({ count: users.length, users: safeUsers });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

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