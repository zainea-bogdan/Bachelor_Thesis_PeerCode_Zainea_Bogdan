const express = require("express");
const router = express.Router();
const CourseController = require("../controllers/courseController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/", authMiddleware, role("teacher"), CourseController.createCourse);
router.get("/", authMiddleware, role("teacher"), CourseController.getCourses);
router.get("/:id", authMiddleware, CourseController.getCourseById);
router.patch("/:id", authMiddleware, role("teacher"), CourseController.updateCourse);
router.delete("/:id", authMiddleware, role("teacher"), CourseController.deleteCourse);

module.exports = router;
