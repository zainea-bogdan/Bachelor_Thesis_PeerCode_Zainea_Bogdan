const { CourseEnrollment, Student, Course } = require("../models/index");

const EnrollmentController = {
  bulkEnroll: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const { student_ids } = req.body;

      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: "student_ids array is required" });
      }

      await CourseEnrollment.bulkCreate(
        student_ids.map((student_id) => ({
          course_id: course.id,
          student_id,
          enrollment_type: "manual",
        })),
        { ignoreDuplicates: true },
      );

      res.status(201).json({ message: `${student_ids.length} students enrolled` });
    } catch (err) {
      next(err);
    }
  },
  getStudentCourses: async (req, res, next) => {
    try {
      const { Subject } = require("../models/index");
      const enrollments = await CourseEnrollment.findAll({
        where: { student_id: req.user.id },
        include: [
          {
            model: Course,
            include: [{ model: Subject, attributes: ["name"] }],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json(enrollments);
    } catch (err) {
      next(err);
    }
  },

  selfEnroll: async (req, res, next) => {
    try {
      const { course_code } = req.body;

      if (!course_code) {
        return res.status(400).json({ error: "course_code is required" });
      }

      const course = await Course.findOne({
        where: { course_code, is_active: true },
      });

      if (!course) {
        return res.status(404).json({ error: "Invalid course code" });
      }

      const existing = await CourseEnrollment.findOne({
        where: { course_id: course.id, student_id: req.user.id },
      });

      if (existing) {
        return res.status(409).json({ error: "Already enrolled in this course" });
      }

      await CourseEnrollment.create({
        course_id: course.id,
        student_id: req.user.id,
        enrollment_type: "self",
      });

      res.status(201).json({ message: "Successfully enrolled", course_id: course.id });
    } catch (err) {
      next(err);
    }
  },

  getEnrolledStudents: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const enrollments = await CourseEnrollment.findAll({
        where: { course_id: req.params.id },
        include: [
          {
            model: Student,
            attributes: ["id", "name", "email", "github_username", "university", "speciality", "year", "series", "group_number"],
          },
        ],
        order: [["createdAt", "ASC"]],
      });

      res.status(200).json(enrollments);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = EnrollmentController;
