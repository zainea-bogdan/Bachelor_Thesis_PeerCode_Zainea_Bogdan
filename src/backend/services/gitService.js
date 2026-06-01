const axios = require("axios");

const GIT_ANALYSIS_URL = process.env.GIT_ANALYSIS_URL || "http://localhost:8000";

const gitService = {
  analyzeStudent: async (username, repoName, startDate, deadline, thresholds) => {
    const response = await axios.post(`${GIT_ANALYSIS_URL}/api/user/${username}/repos/${repoName}/metrics/commits_timeline_analysis`, thresholds || {}, {
      params: {
        project_start_date: startDate,
        deadline,
      },
    });
    return response.data;
  },
  getCommits: async (username, repoName, startDate, deadline) => {
    const response = await axios.get(`${GIT_ANALYSIS_URL}/api/user/${username}/repos/${repoName}/commits`, { params: { start_date: startDate, deadline } });
    return response.data;
  },

  getOneCommit: async (username, repoName, commitSha) => {
    const response = await axios.get(`${GIT_ANALYSIS_URL}/api/user/${username}/repos/${repoName}/commits/${commitSha}`);
    return response.data;
  },
};

module.exports = gitService;
