const sequelize = require("../sequelize");
const { DataTypes } = require("sequelize");

const GitAnalysisStatistics = sequelize.define(
  "git_analysis_statistics",
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
    total_commits: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    active_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    late_start: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    one_day_spike: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    summary: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    analyzed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "git_analysis_statistics" },
);

module.exports = GitAnalysisStatistics;
