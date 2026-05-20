const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Comment = sequelize.define(
  "comment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "blueprint_assignments",
        key: "id",
      },
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    author_role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["teacher", "student"]],
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000],
      },
    },
  },
  { tableName: "comments" },
);

module.exports = Comment;
