const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Notification = sequelize.define(
  "notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    recipient_role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["teacher", "student"]],
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["MATERIAL_UPLOADED", "BLUEPRINT_ASSIGNED", "COMMENT_ADDED", "FEEDBACK_SUBMITTED"]],
      },
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  { tableName: "notifications" },
);

module.exports = Notification;
