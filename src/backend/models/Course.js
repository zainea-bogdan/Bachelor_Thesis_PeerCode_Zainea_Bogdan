const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Course = sequelize.define(
  "course",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    teacher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "teachers",
        key: "id",
      },
    },
    subject_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subjects",
        key: "id",
      },
    },
    university_year: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [4, 9],
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["course", "seminar", "lab"]],
      },
    },
    series: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    course_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    git_thresholds: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "courses" },
);

module.exports = Course;
