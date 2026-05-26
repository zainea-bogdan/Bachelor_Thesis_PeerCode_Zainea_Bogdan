const express = require("express");
const router = express.Router();
const SubjectController = require("../controllers/subjectController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, SubjectController.getSubjects);
router.post("/", authMiddleware, role("teacher"), SubjectController.createSubject);

module.exports = router;
