import AssignmentsDao from "./dao.js";
import AssignmentModel from "./model.js";

export default function AssignmentsRoutes(app, db) {
  const dao = AssignmentsDao();
  
  // Debug endpoint for assignments
  app.get("/api/assignments/debug/list", async (req, res) => {
    try {
      const { courseId } = req.query;
      const mongooseDb = AssignmentModel.db;
      const dbName = mongooseDb?.databaseName;
      const collectionName = AssignmentModel.collection.name;
      
      let query = {};
      if (courseId) {
        query = { course: courseId };
      }
      
      // Direct MongoDB query
      const directCount = await AssignmentModel.countDocuments(query);
      const directAssignments = await AssignmentModel.find(query).limit(20).lean();
      
      // Raw MongoDB collection query
      const rawCollection = mongooseDb?.collection("assignments");
      let rawCount = 0;
      let rawAssignments = [];
      if (rawCollection) {
        rawCount = await rawCollection.countDocuments(query);
        rawAssignments = await rawCollection.find(query).limit(20).toArray();
      }
      
      const assignments = courseId 
        ? await dao.findAssignmentsForCourse(courseId)
        : await AssignmentModel.find({}).limit(20).lean();
      
      res.json({
        database: dbName,
        collection: collectionName,
        courseId: courseId || "all",
        daoCount: assignments.length,
        directMongoCount: directCount,
        directMongoFindCount: directAssignments.length,
        rawCollectionCount: rawCount,
        rawCollectionFindCount: rawAssignments.length,
        assignments: assignments.map(a => ({
          _id: a._id,
          _idType: typeof a._id,
          title: a.title,
          course: a.course,
          points: a.points
        })),
        rawAssignments: rawAssignments.map(a => ({
          _id: a._id,
          _idType: typeof a._id,
          title: a.title,
          course: a.course,
          points: a.points
        }))
      });
    } catch (error) {
      console.error("Error in assignments debug/list:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  });

  const requireFaculty = (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser || (currentUser.role || "").toUpperCase() !== "FACULTY") {
      res.sendStatus(403);
      return;
    }
    next();
  };

  app.get("/api/courses/:courseId/assignments", async (req, res) => {
    try {
      const assignments = await dao.findAssignmentsForCourse(req.params.courseId);
      console.log(`findAssignmentsForCourse returning: ${assignments.length} assignments for course ${req.params.courseId}`);
      res.json(assignments);
    } catch (error) {
      console.error("Error in findAssignmentsForCourse route:", error);
      res.status(500).json({ message: error.message || "Unable to fetch assignments" });
    }
  });

  app.get("/api/assignments/:assignmentId", async (req, res) => {
    const assignment = await dao.findAssignmentById(req.params.assignmentId);
    if (!assignment) {
      res.sendStatus(404);
      return;
    }
    res.json(assignment);
  });

  app.post(
    "/api/courses/:courseId/assignments",
    requireFaculty,
    async (req, res) => {
      const newAssignment = await dao.createAssignment(
        req.params.courseId,
        req.body
      );
      res.status(201).json(newAssignment);
    }
  );

  app.put("/api/assignments/:assignmentId", requireFaculty, async (req, res) => {
    const updated = await dao.updateAssignment(req.params.assignmentId, req.body);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  });

  app.delete(
    "/api/assignments/:assignmentId",
    requireFaculty,
    async (req, res) => {
      const deleted = await dao.deleteAssignment(req.params.assignmentId);
      if (!deleted) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(204);
    }
  );
}

