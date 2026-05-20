const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const Document = sequelize.define(
  "document",
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
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gcs_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["pdf", "docx", "pptx"]],
      },
    },
    is_indexed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    chroma_chunk_ids: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  { tableName: "documents" },
);

module.exports = Document;
