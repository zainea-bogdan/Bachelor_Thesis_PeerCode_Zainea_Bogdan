const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const AssignmentController = require("../controllers/assignmentController");
const role = require("../middleware/roleMiddleware");

router.patch("/:id/submit", authMiddleware, role("student"), AssignmentController.submitRepo);
router.patch("/:id/review", authMiddleware, role("teacher"), AssignmentController.reviewAssignment);
router.patch("/:id/evaluate", authMiddleware, role("teacher"), AssignmentController.evaluateAssignment);
router.get("/mine", authMiddleware, role("student"), AssignmentController.getMyAssignments);

module.exports = router;
