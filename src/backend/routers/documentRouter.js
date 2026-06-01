const express = require("express");
const router = express.Router({ mergeParams: true });
const multer = require("multer");
const DocumentController = require("../controllers/documentController");
const authMiddleware = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", authMiddleware, role("teacher"), upload.single("file"), DocumentController.uploadDocument);
router.get("/:course_id/documents", authMiddleware, DocumentController.getCourseDocuments);
router.delete("/:id", authMiddleware, role("teacher"), DocumentController.deleteDocument);
router.get("/:id/download", DocumentController.downloadDocument);
module.exports = router;
