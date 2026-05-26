const DEFAULT_THRESHOLDS = require("../config/thresholds");

const resolveThresholds = (courseThresholds, teacherDefaults) => {
  return {
    ...DEFAULT_THRESHOLDS, // base — always present
    ...(teacherDefaults || {}), // teacher overrides base
    ...(courseThresholds || {}), // course overrides teacher
  };
};

module.exports = resolveThresholds;
