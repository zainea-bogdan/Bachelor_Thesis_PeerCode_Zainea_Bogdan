const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Blueprint = sequelize.define(
  "blueprint",
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
    teacher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "teachers",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 200],
      },
    },
    content: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["easy", "medium", "hard"]],
      },
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "generated",
      validate: {
        isIn: [["generated", "confirmed", "assigned"]],
      },
    },
  },
  { tableName: "blueprints" },
);

module.exports = Blueprint;
