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
    const users = await model.find();
    return users.map((u) => u.toObject());
  };

  const findUserById = async (userId) => {
    const user = await model.findById(userId);
    return user ? user.toObject() : null;
  };


  const findUserByUsername = async (username) => {
    const user = await model.findOne({ username: username });
    return user ? user.toObject() : null;
  };

  const findUserByCredentials = async (username, password) => {
    const user = await model.findOne({ username, password });
    return user ? user.toObject() : null;
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
