const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const BlueprintAssignment = sequelize.define(
  "blueprint_assignment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    blueprint_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "blueprints",
        key: "id",
      },
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    repo_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "in_progress",
      validate: {
        isIn: [["in_progress", "submitted", "under_review", "reviewed"]],
      },
    },
    teacher_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    evaluated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "blueprint_assignments",
    indexes: [
      {
        unique: true,
        fields: ["student_id", "blueprint_id"],
      },
    ],
  },
);

module.exports = BlueprintAssignment;
