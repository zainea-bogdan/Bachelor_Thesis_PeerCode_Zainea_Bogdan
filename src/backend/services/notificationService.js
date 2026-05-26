const { Notification } = require("../models/index");

const notificationService = {
  notify: async ({ recipientId, recipientRole, type, payload }) => {
    try {
      await Notification.create({
        recipient_id: recipientId,
        recipient_role: recipientRole,
        type,
        payload,
      });
    } catch (err) {
      console.error("Notification failed:", err.message);
    }
  },
};

module.exports = notificationService;
