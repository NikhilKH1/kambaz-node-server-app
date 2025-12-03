import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function UsersDao() {
  const createUser = async (user) => {
    const newUser = { ...user, _id: uuidv4() };
    const created = await model.create(newUser);
    return created.toObject();
  }
  

  const updateUser = async (userId, user) => {
    await model.updateOne({ _id: userId }, { $set: user });
    const updated = await model.findById(userId);
    return updated ? updated.toObject() : null;
  };

  const findAllUsers = async () => {
    try {
      // Get raw count from MongoDB (no filters)
      const count = await model.countDocuments({});
      console.log("Total users in collection (countDocuments):", count);
      
      // Get all users with explicit empty filter to ensure no defaults are applied
      const users = await model.find({}).lean(); // Use lean() for better performance and to avoid Mongoose document overhead
      console.log("Users found (find):", users.length);
      
      // Also try without lean to see if there's a difference
      const usersWithDoc = await model.find({});
      console.log("Users found (find with documents):", usersWithDoc.length);
      
      // Log sample of _id types and usernames
      if (users.length > 0) {
        console.log("Sample users:", users.slice(0, 5).map(u => ({
          _id: u._id,
          _idType: typeof u._id,
          username: u.username,
          role: u.role
        })));
      }
      
      // Check if there's a discrepancy
      if (count !== users.length) {
        console.warn(`⚠️ WARNING: Count mismatch! countDocuments: ${count}, find().length: ${users.length}`);
      }
      
      return users.map((u) => u); // Already plain objects from lean()
    } catch (error) {
      console.error("Error in findAllUsers:", error);
      throw error;
    }
  };

  const findUserById = async (userId) => {
    const user = await model.findById(userId);
    return user ? user.toObject() : null;
  };


  const findUserByUsername = async (username) => {
    try {
      // Escape special regex characters in username
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try exact match first (faster)
      let user = await model.findOne({ username: username }).lean();
      
      if (!user) {
        // Fallback to case-insensitive username search
        user = await model.findOne({ 
          username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } 
        }).lean();
      }
      
      if (user) {
        console.log("findUserByUsername found:", user.username, "ID:", user._id, "ID type:", typeof user._id);
      }
      
      return user; // Already plain object from lean()
    } catch (error) {
      console.error("Error in findUserByUsername:", error);
      throw error;
    }
  };

  const findUserByCredentials = async (username, password) => {
    try {
      // Escape special regex characters in username
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try exact match first (faster) - use lean() for plain objects
      let user = await model.findOne({ 
        username: username,
        password: password 
      }).lean();
      
      if (!user) {
        // Fallback to case-insensitive username search with exact password
        user = await model.findOne({ 
          username: { $regex: new RegExp(`^${escapedUsername}$`, "i") },
          password: password 
        }).lean();
      }
      
      // If still not found, try to find by username only to debug
      if (!user) {
        const userByUsername = await model.findOne({ 
          username: { $regex: new RegExp(`^${escapedUsername}$`, "i") }
        }).lean();
        if (userByUsername) {
          console.log("User found by username but password doesn't match");
          console.log("Expected password:", password);
          console.log("Stored password:", userByUsername.password);
          console.log("Passwords match exactly:", password === userByUsername.password);
          console.log("Expected password length:", password.length);
          console.log("Stored password length:", userByUsername.password ? userByUsername.password.length : 0);
        }
      }
      
      return user; // Already plain object from lean()
    } catch (error) {
      console.error("Error in findUserByCredentials:", error);
      throw error;
    }
  };

  const deleteUser = async (userId) => {
    const deleted = await model.findByIdAndDelete(userId);
    return deleted ? deleted.toObject() : null;
  };

  const findUsersByRole = async (role) => {
    const users = await model.find({ role: role });
    return users.map((u) => u.toObject());
  };

  const findUsersByPartialName = async (partialName) => {
    const regex = new RegExp(partialName, "i"); // 'i' makes it case-insensitive
    const users = await model.find({
      $or: [{ firstName: { $regex: regex } }, { lastName: { $regex: regex } }],
    });
    return users.map((u) => u.toObject());
  };
  

  return {
    createUser,
    findAllUsers,
    findUserById,
    findUserByUsername,
    findUserByCredentials,
    updateUser,
    deleteUser,
    findUsersByRole,
    findUsersByPartialName
  };
}
