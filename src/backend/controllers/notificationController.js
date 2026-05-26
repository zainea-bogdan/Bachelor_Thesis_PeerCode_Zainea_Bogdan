const { Notification } = require("../models/index");

const NotificationController = {
  getNotifications: async (req, res, next) => {
    try {
      const notifications = await Notification.findAll({
        where: {
          recipient_id: req.user.id,
          recipient_role: req.user.role,
        },
        order: [
          ["is_read", "ASC"],
          ["createdAt", "DESC"],
        ],
      });
      res.status(200).json(notifications);
    } catch (err) {
      next(err);
    }
  },

  markOneRead: async (req, res, next) => {
    try {
      const notification = await Notification.findOne({
        where: {
          id: req.params.id,
          recipient_id: req.user.id,
        },
      });

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      await notification.update({ is_read: true });
      res.status(200).json({ message: "Notification marked as read" });
    } catch (err) {
      next(err);
    }
  },

  markAllRead: async (req, res, next) => {
    try {
      await Notification.update(
        { is_read: true },
        {
          where: {
            recipient_id: req.user.id,
            recipient_role: req.user.role,
            is_read: false,
          },
        },
      );
      res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = NotificationController;
