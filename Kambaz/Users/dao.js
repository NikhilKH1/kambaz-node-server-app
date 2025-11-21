import { v4 as uuidv4 } from "uuid";

export default function UsersDao(db) {
  const withUsers = () => db.users || [];

  const createUser = (user) => {
    const newUser = { ...user, _id: uuidv4() };
    db.users = [...withUsers(), newUser];
    return newUser;
  };

  const findAllUsers = () => withUsers();

  const findUserById = (userId) =>
    withUsers().find((user) => user._id === userId);

  const findUserByUsername = (username) =>
    withUsers().find((user) => user.username === username);

  const findUserByCredentials = (username, password) =>
    withUsers().find(
      (user) => user.username === username && user.password === password
    );

  const updateUser = (userId, updates) => {
    const user = findUserById(userId);
    if (!user) {
      return null;
    }
    Object.assign(user, updates);
    return user;
  };

  const deleteUser = (userId) => {
    const before = withUsers().length;
    db.users = withUsers().filter((u) => u._id !== userId);
    return before !== db.users.length;
  };

  return {
    createUser,
    findAllUsers,
    findUserById,
    findUserByUsername,
    findUserByCredentials,
    updateUser,
    deleteUser,
  };
}
