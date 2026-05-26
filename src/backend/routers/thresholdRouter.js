const express = require("express");
const router = express.Router();
const ThresholdController = require("../controllers/thresholdController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/defaults", ThresholdController.getDefaults);
router.get("/teacher", authMiddleware, role("teacher"), ThresholdController.getTeacherThresholds);
router.patch("/teacher", authMiddleware, role("teacher"), ThresholdController.updateTeacherThresholds);
router.patch("/teacher/reset", authMiddleware, role("teacher"), ThresholdController.resetTeacherThresholds);
router.get("/courses/:id", authMiddleware, role("teacher"), ThresholdController.getCourseThresholds);
router.patch("/courses/:id", authMiddleware, role("teacher"), ThresholdController.updateCourseThresholds);
router.patch("/courses/:id/reset", authMiddleware, role("teacher"), ThresholdController.resetCourseThresholds);

module.exports = router;
