const { BlueprintAssignment, Blueprint, Course, CourseEnrollment, GitAnalysisStatistics } = require("../models/index");
const notificationService = require("../services/notificationService");

const AssignmentController = {
  joinBlueprint: async (req, res, next) => {
    try {
      const blueprint = await Blueprint.findByPk(req.params.id);

      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }

      if (blueprint.status !== "assigned") {
        return res.status(400).json({ error: "Blueprint is not available for joining" });
      }

      // check student is enrolled in the course
      const enrollment = await CourseEnrollment.findOne({
        where: {
          course_id: blueprint.course_id,
          student_id: req.user.id,
        },
      });

      if (!enrollment) {
        return res.status(403).json({ error: "You are not enrolled in this course" });
      }

      // check student hasn't already joined a blueprint for this course
      const existing = await BlueprintAssignment.findOne({
        where: { student_id: req.user.id },
        include: [
          {
            model: Blueprint,
            where: { course_id: blueprint.course_id },
          },
        ],
      });

      if (existing) {
        return res.status(409).json({ error: "You already have an active project in this course" });
      }

      const assignment = await BlueprintAssignment.create({
        blueprint_id: blueprint.id,
        student_id: req.user.id,
        status: "in_progress",
      });

      res.status(201).json({ message: "Successfully joined blueprint", assignment });
    } catch (err) {
      next(err);
    }
  },

  submitRepo: async (req, res, next) => {
    try {
      const { repo_url } = req.body;

      if (!repo_url) {
        return res.status(400).json({ error: "repo_url is required" });
      }

      const assignment = await BlueprintAssignment.findOne({
        where: { id: req.params.id, student_id: req.user.id },
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      if (assignment.status !== "in_progress") {
        return res.status(400).json({ error: "Only in_progress assignments can be submitted" });
      }

      await assignment.update({
        repo_url,
        status: "submitted",
        submitted_at: new Date(),
      });

      // notify teacher
      const blueprint = await Blueprint.findByPk(assignment.blueprint_id);
      await notificationService.notify({
        recipientId: blueprint.teacher_id,
        recipientRole: "teacher",
        type: "FEEDBACK_SUBMITTED",
        payload: {
          assignment_id: assignment.id,
          student_id: req.user.id,
          repo_url,
          course_id: blueprint.course_id,
        },
      });

      res.status(200).json({ message: "Repository submitted", assignment });
    } catch (err) {
      next(err);
    }
  },

  reviewAssignment: async (req, res, next) => {
    try {
      const assignment = await BlueprintAssignment.findByPk(req.params.id, {
        include: [{ model: Blueprint }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      if (assignment.blueprint.teacher_id !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (assignment.status !== "submitted") {
        return res.status(400).json({ error: "Only submitted assignments can be reviewed" });
      }

      await assignment.update({ status: "under_review" });

      res.status(200).json({ message: "Assignment marked for review", assignment });
    } catch (err) {
      next(err);
    }
  },

  evaluateAssignment: async (req, res, next) => {
    try {
      const { teacher_note } = req.body;

      if (!teacher_note) {
        return res.status(400).json({ error: "teacher_note is required" });
      }

      const assignment = await BlueprintAssignment.findByPk(req.params.id, {
        include: [{ model: Blueprint }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      if (assignment.blueprint.teacher_id !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!["under_review", "reviewed"].includes(assignment.status)) {
        return res.status(400).json({ error: "Only under_review or reviewed assignments can be evaluated" });
      }

      await assignment.update({
        teacher_note,
        status: "reviewed",
        evaluated_at: new Date(),
      });

      // notify student
      await notificationService.notify({
        recipientId: assignment.student_id,
        recipientRole: "student",
        type: "COMMENT_ADDED",
        payload: {
          assignment_id: assignment.id,
          teacher_note,
          course_id: assignment.blueprint.course_id,
        },
      });

      res.status(200).json({ message: "Assignment evaluated", assignment });
    } catch (err) {
      next(err);
    }
  },

  getMyAssignments: async (req, res, next) => {
    try {
      const assignments = await BlueprintAssignment.findAll({
        where: { student_id: req.user.id },
        include: [
          {
            model: Blueprint,
            attributes: ["title", "domain", "difficulty", "status", "course_id", "content"],
          },
          {
            model: GitAnalysisStatistics,
            order: [["analyzed_at", "DESC"]],
            limit: 1,
          },
        ],
        order: [["joined_at", "DESC"]],
      });

      res.status(200).json(assignments);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AssignmentController;
