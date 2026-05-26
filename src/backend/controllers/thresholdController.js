const { Teacher, Course } = require("../models/index");
const DEFAULT_THRESHOLDS = require("../config/thresholds");
const resolveThresholds = require("../utils/resolveThresholds");

const ThresholdController = {
  getDefaults: (req, res) => {
    res.status(200).json(DEFAULT_THRESHOLDS);
  },

  getTeacherThresholds: async (req, res, next) => {
    try {
      const teacher = await Teacher.findByPk(req.user.id, {
        attributes: ["git_thresholds_default"],
      });
      res.status(200).json({
        teacher_defaults: teacher.git_thresholds_default,
        resolved: resolveThresholds(null, teacher.git_thresholds_default),
      });
    } catch (err) {
      next(err);
    }
  },

  updateTeacherThresholds: async (req, res, next) => {
    try {
      const teacher = await Teacher.findByPk(req.user.id);
      await teacher.update({ git_thresholds_default: req.body });
      res.status(200).json({ message: "Teacher thresholds updated", thresholds: req.body });
    } catch (err) {
      next(err);
    }
  },

  resetTeacherThresholds: async (req, res, next) => {
    try {
      const teacher = await Teacher.findByPk(req.user.id);
      await teacher.update({ git_thresholds_default: null });
      res.status(200).json({ message: "Teacher thresholds reset to system defaults", thresholds: DEFAULT_THRESHOLDS });
    } catch (err) {
      next(err);
    }
  },

  getCourseThresholds: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const teacher = await Teacher.findByPk(req.user.id, {
        attributes: ["git_thresholds_default"],
      });

      res.status(200).json({
        course_thresholds: course.git_thresholds,
        teacher_defaults: teacher.git_thresholds_default,
        resolved: resolveThresholds(course.git_thresholds, teacher.git_thresholds_default),
      });
    } catch (err) {
      next(err);
    }
  },

  updateCourseThresholds: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      await course.update({ git_thresholds: req.body });
      res.status(200).json({ message: "Course thresholds updated", thresholds: req.body });
    } catch (err) {
      next(err);
    }
  },

  resetCourseThresholds: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const teacher = await Teacher.findByPk(req.user.id, {
        attributes: ["git_thresholds_default"],
      });

      await course.update({ git_thresholds: null });

      res.status(200).json({
        message: "Course thresholds reset",
        resolved: resolveThresholds(null, teacher.git_thresholds_default),
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ThresholdController;
