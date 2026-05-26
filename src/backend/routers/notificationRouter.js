const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, NotificationController.getNotifications);
router.patch("/:id/read", authMiddleware, NotificationController.markOneRead);
router.patch("/read-all", authMiddleware, NotificationController.markAllRead);

module.exports = router;
