import EnrollmentsDao from "./dao.js";
import EnrollmentModel from "./model.js";

export default function EnrollmentsRoutes(app, db) {
  const dao = EnrollmentsDao();
  
  // Debug endpoint for enrollments
  app.get("/api/enrollments/debug/list", async (req, res) => {
    try {
      const { userId, courseId } = req.query;
      const mongooseDb = EnrollmentModel.db;
      const dbName = mongooseDb?.databaseName;
      const collectionName = EnrollmentModel.collection.name;
      
      let query = {};
      if (userId) {
        query.user = userId;
      }
      if (courseId) {
        query.course = courseId;
      }
      
      // Direct MongoDB query
      const directCount = await EnrollmentModel.countDocuments(query);
      const directEnrollments = await EnrollmentModel.find(query).limit(20).lean();
      
      // Raw MongoDB collection query
      const rawCollection = mongooseDb?.collection("enrollments");
      let rawCount = 0;
      let rawEnrollments = [];
      if (rawCollection) {
        rawCount = await rawCollection.countDocuments(query);
        rawEnrollments = await rawCollection.find(query).limit(20).toArray();
      }
      
      let enrollments = [];
      if (userId) {
        enrollments = await dao.findEnrollmentsForUser(userId);
      } else {
        enrollments = await EnrollmentModel.find(query).limit(20).lean();
      }
      
      res.json({
        database: dbName,
        collection: collectionName,
        userId: userId || "all",
        courseId: courseId || "all",
        daoCount: enrollments.length,
        directMongoCount: directCount,
        directMongoFindCount: directEnrollments.length,
        rawCollectionCount: rawCount,
        rawCollectionFindCount: rawEnrollments.length,
        enrollments: enrollments.map(e => ({
          _id: e._id,
          _idType: typeof e._id,
          user: e.user,
          course: e.course,
          status: e.status
        })),
        rawEnrollments: rawEnrollments.map(e => ({
          _id: e._id,
          _idType: typeof e._id,
          user: e.user,
          course: e.course,
          status: e.status
        }))
      });
    } catch (error) {
      console.error("Error in enrollments debug/list:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  });

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
    try {
      const userId = resolveUserId(req, res);
      if (!userId) return;
      const enrollments = await dao.findEnrollmentsForUser(userId);
      console.log(`findEnrollmentsForUser returning: ${enrollments.length} enrollments for user ${userId}`);
      res.json(enrollments);
    } catch (error) {
      console.error("Error in findEnrollmentsForUser route:", error);
      res.status(500).json({ message: error.message || "Unable to fetch enrollments" });
    }
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

