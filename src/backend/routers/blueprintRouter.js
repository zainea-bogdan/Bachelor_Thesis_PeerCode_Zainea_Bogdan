const express = require("express");
const router = express.Router({ mergeParams: true });
const BlueprintController = require("../controllers/blueprintController");
const AssignmentController = require("../controllers/assignmentController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/generate", authMiddleware, role("teacher"), BlueprintController.generateBlueprint);
router.patch("/:id/confirm", authMiddleware, role("teacher"), BlueprintController.confirmBlueprint);
router.patch("/:id/assign", authMiddleware, role("teacher"), BlueprintController.assignBlueprint);
router.get("/course/:course_id", authMiddleware, BlueprintController.getCourseBlueprintsController);
router.get("/course/:course_id/available", authMiddleware, role("student"), BlueprintController.getAvailableBlueprints);
router.post("/:id/join", authMiddleware, role("student"), AssignmentController.joinBlueprint);

module.exports = router;
