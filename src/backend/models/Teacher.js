const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Teacher = sequelize.define(
  "teacher",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    git_thresholds_default: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  { tableName: "teachers" },
);

module.exports = Teacher;
