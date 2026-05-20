const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Student = sequelize.define(
  "student",
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
    github_username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    university: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    speciality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 6,
      },
    },
    series: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    group_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { tableName: "students" },
);

module.exports = Student;
