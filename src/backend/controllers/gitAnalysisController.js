const { BlueprintAssignment, Blueprint, Course, CourseEnrollment, Student, GitAnalysisStatistics } = require("../models/index");
const gitService = require("../services/gitService");
const resolveThresholds = require("../utils/resolveThresholds");
const { Op } = require("sequelize");

const GitAnalysisController = {
  refreshAnalytics: async (req, res, next) => {
    try {
      const { course_id, filters } = req.body;

      if (!course_id) {
        return res.status(400).json({ error: "course_id is required" });
      }

      // verify teacher owns this course
      const course = await Course.findOne({
        where: { id: course_id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // build student filter
      const studentWhere = {};
      if (filters) {
        if (filters.series) studentWhere.series = filters.series;
        if (filters.year) studentWhere.year = filters.year;
        if (filters.group_number) studentWhere.group_number = filters.group_number;
        if (filters.speciality) studentWhere.speciality = filters.speciality;
      }

      // get submitted assignments for this course matching filters
      const assignments = await BlueprintAssignment.findAll({
        where: {
          status: { [Op.in]: ["submitted", "under_review", "reviewed"] },
          repo_url: { [Op.ne]: null },
        },
        include: [
          {
            model: Blueprint,
            where: { course_id },
            attributes: ["id", "content", "course_id"],
          },
          {
            model: Student,
            where: studentWhere,
            attributes: ["id", "name", "github_username", "series", "year", "group_number"],
          },
        ],
      });

      if (assignments.length === 0) {
        return res.status(200).json({ message: "No submitted assignments found", analyzed: 0 });
      }

      // resolve thresholds for this course
      const thresholds = resolveThresholds(course.git_thresholds, null);

      const results = [];

      for (const assignment of assignments) {
        const student = assignment.student;
        const repoUrl = assignment.repo_url;

        if (!student.github_username || !repoUrl) {
          results.push({
            assignment_id: assignment.id,
            status: "skipped",
            reason: "Missing github_username or repo_url",
          });
          continue;
        }

        // extract repo name from URL
        const repoName = repoUrl.split("/").pop();

        // get blueprint dates
        const blueprintContent = assignment.blueprint.content;
        const startDate = blueprintContent.start_date;
        const deadline = blueprintContent.deadline;

        try {
          const analysisResult = await gitService.analyzeStudent(student.github_username, repoName, startDate, deadline, thresholds);

          const metrics = analysisResult?.commits_timeline_analysis_metrics?.metrics || {};

          const flags = analysisResult?.commits_timeline_analysis_metrics?.flags || [];

          // derive boolean flags from thresholds
          const lateStart = metrics.days_before_start_to_first_commit ? metrics.days_before_start_to_first_commit / metrics.project_window_days > (thresholds.late_start_pattern || 0.6) : false;

          const oneDaySpike = metrics.max_day_commits_ratio ? metrics.max_day_commits_ratio > (thresholds.high_same_day_concentration || 0.6) : false;

          // append new statistics record
          await GitAnalysisStatistics.create({
            assignment_id: assignment.id,
            total_commits: metrics.total_student_authored_commits || 0,
            active_days: metrics.active_days || 0,
            late_start: lateStart,
            one_day_spike: oneDaySpike,
            summary: {
              metrics,
              flags,
              metadata_dates: analysisResult?.commits_timeline_analysis_metrics?.metadata_dates,
            },
          });

          results.push({
            assignment_id: assignment.id,
            student_name: student.name,
            status: "analyzed",
            total_commits: metrics.total_student_authored_commits,
            active_days: metrics.active_days,
            late_start: lateStart,
            one_day_spike: oneDaySpike,
            flags_count: flags.length,
          });
        } catch (err) {
          results.push({
            assignment_id: assignment.id,
            student_name: student.name,
            status: "failed",
            reason: err.message,
          });
        }
      }

      res.status(200).json({
        message: "Analysis complete",
        analyzed: results.filter((r) => r.status === "analyzed").length,
        failed: results.filter((r) => r.status === "failed").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        results,
      });
    } catch (err) {
      next(err);
    }
  },

  getCourseAnalytics: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const assignments = await BlueprintAssignment.findAll({
        include: [
          {
            model: Blueprint,
            where: { course_id: req.params.id },
            attributes: ["title", "domain", "difficulty"],
          },
          {
            model: Student,
            attributes: ["id", "name", "github_username", "series", "year", "group_number"],
          },
          {
            model: GitAnalysisStatistics,
            order: [["analyzed_at", "DESC"]],
            limit: 1,
          },
        ],
      });

      res.status(200).json(assignments);
    } catch (err) {
      next(err);
    }
  },
  getStudentCommits: async (req, res, next) => {
    try {
      const { username, repo_name } = req.params;
      const { start_date, deadline } = req.query;
      const response = await gitService.getCommits(username, repo_name, start_date, deadline);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  getOneCommit: async (req, res, next) => {
    try {
      const { username, repo_name, commit_sha } = req.params;
      const response = await gitService.getOneCommit(username, repo_name, commit_sha);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
  getStudentsWithNoAssignment: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const { sequelize } = require("../models/index");
      const { QueryTypes } = require("sequelize");

      const students = await sequelize.query(
        `
        SELECT s.id, s.name, s.email, s.github_username, s.series, s.year, s.group_number
        FROM course_enrollments ce
        JOIN students s ON s.id = ce."student_id"
        LEFT JOIN blueprint_assignments ba ON ba."student_id" = ce."student_id"
        LEFT JOIN blueprints b ON b.id = ba."blueprint_id" AND b."course_id" = :course_id
        WHERE ce."course_id" = :course_id
        AND ba.id IS NULL
      `,
        {
          replacements: { course_id: req.params.id },
          type: QueryTypes.SELECT,
        },
      );

      res.status(200).json(students);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = GitAnalysisController;
