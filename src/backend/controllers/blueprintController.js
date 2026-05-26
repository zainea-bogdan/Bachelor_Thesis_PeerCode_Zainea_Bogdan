const { Blueprint, Course, CourseEnrollment, Student } = require("../models/index");
const ragService = require("../services/ragService");
const notificationService = require("../services/notificationService");

const BlueprintController = {
  generateBlueprint: async (req, res, next) => {
    try {
      const { course_id, course_name, context, domain, projects_count, difficulty_per_slot, start_date, deadline } = req.body;

      if (!course_id || !context || !domain || !projects_count || !difficulty_per_slot || !start_date || !deadline) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const course = await Course.findOne({
        where: { id: course_id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // call RAG module to generate blueprint
      const ragResponse = await ragService.generateBlueprint({
        course_id,
        course_name: course_name || domain,
        teacher_id: req.user.id,
        context,
        domain,
        projects_count,
        difficulty_per_slot,
        start_date,
        deadline,
      });

      // save each generated blueprint
      const savedBlueprints = [];
      const blueprints = ragResponse.blueprints || [ragResponse];

      for (const bp of blueprints) {
        const blueprint = await Blueprint.create({
          course_id,
          teacher_id: req.user.id,
          title: bp.title || `${domain} Project`,
          content: bp,
          difficulty: bp.difficulty || difficulty_per_slot[0],
          domain,
          status: "generated",
        });
        savedBlueprints.push(blueprint);
      }

      res.status(201).json({
        message: "Blueprints generated",
        blueprints: savedBlueprints,
        chunks_used: ragResponse.chunks_used || [],
      });
    } catch (err) {
      next(err);
    }
  },

  confirmBlueprint: async (req, res, next) => {
    try {
      const blueprint = await Blueprint.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }

      if (blueprint.status !== "generated") {
        return res.status(400).json({ error: "Only generated blueprints can be confirmed" });
      }

      await blueprint.update({ status: "confirmed" });
      res.status(200).json({ message: "Blueprint confirmed", blueprint });
    } catch (err) {
      next(err);
    }
  },

  assignBlueprint: async (req, res, next) => {
    try {
      const blueprint = await Blueprint.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }

      if (blueprint.status !== "confirmed") {
        return res.status(400).json({ error: "Only confirmed blueprints can be assigned" });
      }

      await blueprint.update({ status: "assigned" });

      // notify all enrolled students
      const enrollments = await CourseEnrollment.findAll({
        where: { course_id: blueprint.course_id },
      });

      await Promise.all(
        enrollments.map((e) =>
          notificationService.notify({
            recipientId: e.student_id,
            recipientRole: "student",
            type: "BLUEPRINT_ASSIGNED",
            payload: {
              blueprint_id: blueprint.id,
              title: blueprint.title,
              course_id: blueprint.course_id,
            },
          }),
        ),
      );

      res.status(200).json({ message: "Blueprint assigned", blueprint });
    } catch (err) {
      next(err);
    }
  },

  getCourseBlueprintsController: async (req, res, next) => {
    try {
      const course = await Course.findByPk(req.params.course_id);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const blueprints = await Blueprint.findAll({
        where: { course_id: req.params.course_id },
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json(blueprints);
    } catch (err) {
      next(err);
    }
  },

  getAvailableBlueprints: async (req, res, next) => {
    try {
      const blueprints = await Blueprint.findAll({
        where: {
          course_id: req.params.course_id,
          status: "assigned",
        },
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json(blueprints);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = BlueprintController;
