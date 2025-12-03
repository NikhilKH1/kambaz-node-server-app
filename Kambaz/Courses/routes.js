import CoursesDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";
import CourseModel from "./model.js";
export default function CourseRoutes(app, db) {
  const dao = CoursesDao();
  const enrollmentsDao = EnrollmentsDao();
  
  // Debug endpoint for courses
  app.get("/api/courses/debug/list", async (req, res) => {
    try {
      const mongooseDb = CourseModel.db;
      const dbName = mongooseDb?.databaseName;
      const collectionName = CourseModel.collection.name;
      
      // Direct MongoDB query
      const directCount = await CourseModel.countDocuments({});
      const directCourses = await CourseModel.find({}).limit(20).lean();
      
      // Raw MongoDB collection query
      const rawCollection = mongooseDb?.collection("courses");
      let rawCount = 0;
      let rawCourses = [];
      if (rawCollection) {
        rawCount = await rawCollection.countDocuments({});
        rawCourses = await rawCollection.find({}).limit(20).toArray();
      }
      
      const courses = await dao.findAllCourses();
      
      res.json({
        database: dbName,
        collection: collectionName,
        daoCount: courses.length,
        directMongoCount: directCount,
        directMongoFindCount: directCourses.length,
        rawCollectionCount: rawCount,
        rawCollectionFindCount: rawCourses.length,
        courses: courses.map(c => ({
          _id: c._id,
          _idType: typeof c._id,
          name: c.name,
          number: c.number,
          credits: c.credits
        })),
        rawCourses: rawCourses.map(c => ({
          _id: c._id,
          _idType: typeof c._id,
          name: c.name,
          number: c.number,
          credits: c.credits
        }))
      });
    } catch (error) {
      console.error("Error in courses debug/list:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  });

  const createCourse = async (req, res) => {
    const newCourse = await dao.createCourse(req.body);
    const currentUser = req.session["currentUser"];
    enrollmentsDao.enrollUserInCourse(currentUser._id, newCourse._id);
    res.json(newCourse);
  };
  app.post("/api/users/current/courses", createCourse);


  const findAllCourses = async (req, res) => {
    try {
      const courses = await dao.findAllCourses();
      console.log("findAllCourses returning:", courses.length, "courses");
      res.json(courses);
    } catch (error) {
      console.error("Error in findAllCourses route:", error);
      res.status(500).json({ message: error.message || "Unable to fetch courses" });
    }
  }

  const deleteCourse = async (req, res) => {
    const { courseId } = req.params;
    await enrollmentsDao.unenrollAllUsersFromCourse(courseId);
    const status = await dao.deleteCourse(courseId);
    res.send(status);
  }

  const updateCourse = async (req, res) => {
    const { courseId } = req.params;
    const courseUpdates = req.body;
    const status = await dao.updateCourse(courseId, courseUpdates);
    res.send(status);
  }



  const findCoursesForEnrolledUser = async (req, res) => {
    let { userId } = req.params;
    if (userId === "current") {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }
      userId = currentUser._id;
    }
    const courses = await enrollmentsDao.findCoursesForUser(userId);
    res.json(courses);
  };

  const enrollUserInCourse = async (req, res) => {
    let { uid, cid } = req.params;
    if (uid === "current") {
      const currentUser = req.session["currentUser"];
      uid = currentUser._id;
    }
    const status = await enrollmentsDao.enrollUserInCourse(uid, cid);
    res.send(status);
  };
  const unenrollUserFromCourse = async (req, res) => {
    let { uid, cid } = req.params;
    if (uid === "current") {
      const currentUser = req.session["currentUser"];
      uid = currentUser._id;
    }
    const status = await enrollmentsDao.unenrollUserFromCourse(uid, cid);
    res.send(status);
  };

  const findUsersForCourse = async (req, res) => {
    try {
      const { cid } = req.params;
      const users = await enrollmentsDao.findUsersForCourse(cid);
      res.json(users);
    } catch (error) {
      console.error("Error finding users for course:", error);
      res.status(500).json({ message: error.message || "Unable to load users for course." });
    }
  };
  app.get("/api/courses/:cid/users", findUsersForCourse);
  app.post("/api/users/:uid/courses/:cid", enrollUserInCourse);
  app.delete("/api/users/:uid/courses/:cid", unenrollUserFromCourse);
  app.get("/api/users/:userId/courses", findCoursesForEnrolledUser);
  app.get("/api/courses", findAllCourses);
  app.delete("/api/courses/:courseId", deleteCourse);
  app.put("/api/courses/:courseId", updateCourse);
}
