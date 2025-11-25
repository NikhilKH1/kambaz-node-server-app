import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function UsersDao() {
  const createUser = (user) => {
    const newUser = { ...user, _id: uuidv4() };
    return model.create(newUser);
  }
  

  const updateUser = (userId, user) => model.updateOne({ _id: userId }, { $set: user });

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

  const deleteUser = (userId) => model.findByIdAndDelete( userId );

  const findUsersByRole = (role) => model.find({ role: role });

  const findUsersByPartialName = (partialName) => {
    const regex = new RegExp(partialName, "i"); // 'i' makes it case-insensitive
    return model.find({
      $or: [{ firstName: { $regex: regex } }, { lastName: { $regex: regex } }],
    });
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
