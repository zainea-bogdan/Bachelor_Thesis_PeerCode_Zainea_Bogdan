const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

const RAG_MODULE_URL = process.env.RAG_MODULE_URL || "http://localhost:8002";

const ragService = {
  ingestDocument: async (filePath, filename, courseId, teacherId) => {
    const form = new FormData();
    const fullPath = path.join(__dirname, "..", filePath);
    form.append("file", fs.createReadStream(fullPath), filename);
    form.append("course_id", courseId);
    form.append("teacher_id", teacherId);
    form.append("university_year", "2025/2026");

    const response = await axios.post(`${RAG_MODULE_URL}/ingest`, form, {
      headers: form.getHeaders(),
    });

    return response.data;
  },

  generateBlueprint: async (payload) => {
    const response = await axios.post(`${RAG_MODULE_URL}/generate`, payload);
    return response.data;
  },

  deleteChunks: async (filename, courseId, teacherId) => {
    const response = await axios.delete(`${RAG_MODULE_URL}/documents`, {
      data: { filename, course_id: courseId, teacher_id: teacherId },
    });
    return response.data;
  },
};

module.exports = ragService;
