const express = require("express");
const router = express.Router({ mergeParams: true });
const EnrollmentController = require("../controllers/enrollmentController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/bulk", authMiddleware, role("teacher"), EnrollmentController.bulkEnroll);
router.post("/self", authMiddleware, role("student"), EnrollmentController.selfEnroll);
router.get("/students", authMiddleware, role("teacher"), EnrollmentController.getEnrolledStudents);

module.exports = router;
