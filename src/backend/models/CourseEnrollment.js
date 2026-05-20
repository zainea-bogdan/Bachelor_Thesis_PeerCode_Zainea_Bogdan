const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const CourseEnrollment = sequelize.define(
  "course_enrollment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    course_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses",
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
    enrollment_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["auto", "manual", "self"]],
      },
    },
  },
  {
    tableName: "course_enrollments",
    indexes: [
      {
        unique: true,
        fields: ["course_id", "student_id"],
      },
    ],
  },
);

module.exports = CourseEnrollment;
