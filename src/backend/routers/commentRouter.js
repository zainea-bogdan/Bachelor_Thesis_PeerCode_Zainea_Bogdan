const express = require("express");
const router = express.Router({ mergeParams: true });
const CommentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, CommentController.addComment);
router.get("/", authMiddleware, CommentController.getComments);

module.exports = router;
