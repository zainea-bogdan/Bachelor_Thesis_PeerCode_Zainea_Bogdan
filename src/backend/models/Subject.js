const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Subject = sequelize.define(
  "subject",
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
    speciality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10,
      },
    },
  },
  { tableName: "subjects" },
);

module.exports = Subject;
