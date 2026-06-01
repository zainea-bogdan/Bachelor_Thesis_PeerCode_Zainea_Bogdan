const { Document, Course, CourseEnrollment } = require("../models/index");
const gcsService = require("../services/gcsService");
const ragService = require("../services/ragService");
const notificationService = require("../services/notificationService");
const path = require("path");

const DocumentController = {
  uploadDocument: async (req, res, next) => {
    try {
      const { course_id, week_number } = req.body;

      if (!course_id) {
        return res.status(400).json({ error: "course_id is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      // define filename first
      const filename = req.file.originalname;
      const fileExtension = path.extname(filename).toLowerCase().replace(".", "");

      if (!["pdf", "docx", "pptx"].includes(fileExtension)) {
        return res.status(400).json({ error: "Only pdf, docx and pptx files are allowed" });
      }

      const course = await Course.findOne({
        where: { id: course_id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // duplication check — after filename is defined
      const existingDocument = await Document.findOne({
        where: { course_id, filename, teacher_id: req.user.id },
      });
      if (existingDocument) {
        return res.status(409).json({ error: "Document with this filename already exists for this course" });
      }

      // upload to local storage (GCS later)
      const gcs_path = await gcsService.uploadFile(req.file.buffer, filename, req.file.mimetype);

      // save document metadata
      const document = await Document.create({
        course_id,
        teacher_id: req.user.id,
        filename,
        gcs_path,
        file_type: fileExtension,
        is_indexed: false,
        week_number: week_number ? parseInt(week_number) : null,
      });

      // try to ingest into RAG module
      try {
        await ragService.ingestDocument(gcs_path, filename, course_id, req.user.id);
        await document.update({
          is_indexed: true,
          chroma_chunk_ids: [],
        });
      } catch (ragErr) {
        console.error("RAG ingestion failed:", ragErr.message);
      }

      // notify enrolled students
      const enrollments = await CourseEnrollment.findAll({
        where: { course_id },
      });

      await Promise.all(
        enrollments.map((e) =>
          notificationService.notify({
            recipientId: e.student_id,
            recipientRole: "student",
            type: "MATERIAL_UPLOADED",
            payload: {
              document_id: document.id,
              filename: document.filename,
              course_id,
            },
          }),
        ),
      );

      res.status(201).json({ message: "Document uploaded", document });
    } catch (err) {
      next(err);
    }
  },

  getCourseDocuments: async (req, res, next) => {
    try {
      const course = await Course.findByPk(req.params.course_id);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const documents = await Document.findAll({
        where: { course_id: req.params.course_id },
        order: [
          ["week_number", "ASC"],
          ["createdAt", "DESC"],
        ],
      });

      res.status(200).json(documents);
    } catch (err) {
      next(err);
    }
  },
  downloadDocument: async (req, res, next) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }

      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("../config/auth");

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const document = await Document.findByPk(req.params.id);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const filePath = path.resolve(document.gcs_path);
      res.download(filePath, document.filename);
    } catch (err) {
      next(err);
    }
  },
  deleteDocument: async (req, res, next) => {
    try {
      const document = await Document.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // delete from local storage / GCS
      await gcsService.deleteFile(document.gcs_path);

      // delete chunks from ChromaDB via RAG module
      if (document.is_indexed) {
        try {
          await ragService.deleteChunks(document.filename, document.course_id, document.teacher_id);
        } catch (ragErr) {
          console.error("RAG chunk deletion failed:", ragErr.message);
        }
      }

      await document.destroy();

      res.status(200).json({ message: "Document deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = DocumentController;
