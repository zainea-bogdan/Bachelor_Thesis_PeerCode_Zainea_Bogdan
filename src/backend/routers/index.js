const express = require("express");
const router = express.Router();

const authRouter = require("./authRouter");
const subjectRouter = require("./subjectRouter");
const courseRouter = require("./courseRouter");
const enrollmentRouter = require("./enrollmentRouter");
const documentRouter = require("./documentRouter");
const blueprintRouter = require("./blueprintRouter");
const assignmentRouter = require("./assignmentRouter");
const gitAnalysisRouter = require("./gitAnalysisRouter");
const commentRouter = require("./commentRouter");
const notificationRouter = require("./notificationRouter");
const thresholdRouter = require("./thresholdRouter");

router.use("/auth", authRouter);
router.use("/subjects", subjectRouter);
router.use("/courses", courseRouter);
router.use("/courses/:id/enroll", enrollmentRouter);
router.use("/documents", documentRouter);
router.use("/blueprints", blueprintRouter);
router.use("/assignments", assignmentRouter);
router.use("/analytics", gitAnalysisRouter);
router.use("/assignments/:id/comments", commentRouter);
router.use("/notifications", notificationRouter);
router.use("/thresholds", thresholdRouter);
module.exports = router;
