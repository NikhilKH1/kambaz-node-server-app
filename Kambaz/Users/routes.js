import UsersDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";
import UserModel from "./model.js";

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
      
      console.log("=== SIGNIN ATTEMPT ===");
      console.log("Username:", trimmedUsername);
      console.log("Password length:", trimmedPassword.length);
      console.log("Request origin:", req.headers.origin || "no origin");
      
      // First, check if username exists
      const userExists = await dao.findUserByUsername(trimmedUsername);
      
      if (!userExists) {
        console.log("❌ Username not found in database:", trimmedUsername);
        // Check total user count for debugging
        const totalUsers = await dao.findAllUsers();
        console.log("Total users in database:", totalUsers.length);
        if (totalUsers.length > 0) {
          console.log("Sample usernames:", totalUsers.slice(0, 5).map(u => u.username));
        }
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }
      
      console.log("✓ Username found:", userExists.username);
      console.log("Stored password length:", userExists.password ? userExists.password.length : 0);
      
      // Now try to find with credentials
      const currentUser = await dao.findUserByCredentials(trimmedUsername, trimmedPassword);
      
      if (currentUser) {
        console.log("✓ Credentials match!");
        console.log("User ID:", currentUser._id);
        console.log("User role:", currentUser.role);
        
        req.session["currentUser"] = currentUser;
        // Explicitly save session to ensure it's persisted
        req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error:", err);
            res.status(500).json({ message: "Failed to create session" });
            return;
          }
          console.log("✓ Session saved successfully");
          console.log("=== SIGNIN SUCCESS ===");
          res.json(currentUser);
        });
      } else {
        console.log("❌ Password mismatch");
        console.log("Input password:", trimmedPassword);
        console.log("Stored password:", userExists.password);
        console.log("Passwords match:", trimmedPassword === userExists.password);
        res.status(401).json({ message: "Invalid username or password" });
      }
    } catch (error) {
      console.error("❌ Signin error:", error);
      console.error("Error stack:", error.stack);
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
      // Direct MongoDB query to verify
      const directCount = await UserModel.countDocuments();
      const directUsers = await UserModel.find().limit(20);
      
      console.log("=== DEBUG LIST ENDPOINT ===");
      console.log("Direct MongoDB count:", directCount);
      console.log("Direct MongoDB find result:", directUsers.length);
      console.log("Database name:", UserModel.db?.databaseName);
      console.log("Collection name:", UserModel.collection.name);
      
      const users = await dao.findAllUsers();
      
      // Return usernames and password lengths (not actual passwords) for debugging
      const safeUsers = users.map(u => ({
        _id: u._id,
        _idType: typeof u._id,
        username: u.username,
        passwordLength: u.password ? u.password.length : 0,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email
      }));
      
      res.json({ 
        daoCount: users.length,
        directMongoCount: directCount,
        directMongoFindCount: directUsers.length,
        users: safeUsers,
        message: "Use /api/users/debug/test/:username to test specific username lookup"
      });
    } catch (error) {
      console.error("Error in debug/list:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  });
  
  // Debug endpoint to test signin with specific credentials
  app.post("/api/users/debug/test-signin", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ message: "Username and password required" });
        return;
      }
      
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      
      // Check if user exists
      const userExists = await dao.findUserByUsername(trimmedUsername);
      if (!userExists) {
        res.json({
          found: false,
          message: "Username not found",
          username: trimmedUsername
        });
        return;
      }
      
      // Try credentials
      const user = await dao.findUserByCredentials(trimmedUsername, trimmedPassword);
      
      res.json({
        found: true,
        credentialsMatch: !!user,
        username: userExists.username,
        storedPasswordLength: userExists.password ? userExists.password.length : 0,
        inputPasswordLength: trimmedPassword.length,
        passwordMatches: trimmedPassword === userExists.password,
        userId: userExists._id,
        role: userExists.role
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Direct MongoDB query endpoint (bypasses DAO)
  app.get("/api/users/debug/direct-query", async (req, res) => {
    try {
      const { username } = req.query;
      
      if (username) {
        // Query specific username directly
        const user = await UserModel.findOne({ username: username });
        const userCaseInsensitive = await UserModel.findOne({ 
          username: { $regex: new RegExp(`^${username}$`, "i") } 
        });
        
        res.json({
          exactMatch: user ? {
            _id: user._id,
            username: user.username,
            passwordLength: user.password ? user.password.length : 0,
            role: user.role
          } : null,
          caseInsensitiveMatch: userCaseInsensitive ? {
            _id: userCaseInsensitive._id,
            username: userCaseInsensitive.username,
            passwordLength: userCaseInsensitive.password ? userCaseInsensitive.password.length : 0,
            role: userCaseInsensitive.role
          } : null
        });
      } else {
        // Get all users directly from MongoDB
        const allUsers = await UserModel.find({});
        const count = await UserModel.countDocuments({});
        
        res.json({
          count: count,
          usersFound: allUsers.length,
          users: allUsers.map(u => ({
            _id: u._id,
            _idType: typeof u._id,
            username: u.username,
            passwordLength: u.password ? u.password.length : 0,
            role: u.role,
            firstName: u.firstName,
            lastName: u.lastName
          }))
        });
      }
    } catch (error) {
      console.error("Direct query error:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  });

  // Debug endpoint to test specific username lookup
  app.get("/api/users/debug/test/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await dao.findUserByUsername(username);
      if (user) {
        res.json({
          found: true,
          username: user.username,
          passwordLength: user.password ? user.password.length : 0,
          role: user.role,
          _id: user._id
        });
      } else {
        // Try to find with exact match
        const exactUser = await model.findOne({ username: username });
        const caseInsensitiveUser = await model.findOne({ 
          username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } 
        });
        res.json({
          found: false,
          exactMatch: exactUser ? true : false,
          caseInsensitiveMatch: caseInsensitiveUser ? true : false,
          message: "User not found with findUserByUsername"
        });
      }
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