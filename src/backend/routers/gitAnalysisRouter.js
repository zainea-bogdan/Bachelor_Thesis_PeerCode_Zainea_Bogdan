const express = require("express");
const router = express.Router();
const GitAnalysisController = require("../controllers/gitAnalysisController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/refresh", authMiddleware, role("teacher"), GitAnalysisController.refreshAnalytics);
router.get("/courses/:id/analytics", authMiddleware, role("teacher"), GitAnalysisController.getCourseAnalytics);
router.get("/courses/:id/students/no-assignment", authMiddleware, role("teacher"), GitAnalysisController.getStudentsWithNoAssignment);
router.get("/commits/:username/:repo_name", authMiddleware, role("teacher"), GitAnalysisController.getStudentCommits);
router.get("/commits/:username/:repo_name/:commit_sha", authMiddleware, role("teacher"), GitAnalysisController.getOneCommit);
module.exports = router;
