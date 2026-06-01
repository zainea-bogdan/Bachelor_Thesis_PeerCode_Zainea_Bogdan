const { Course, Student, CourseEnrollment, Subject } = require("../models/index");

const generateCourseCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const CourseController = {
  createCourse: async (req, res, next) => {
    try {
      const { subject_id, university_year, type, series, student_year, start_date, end_date } = req.body;

      if (!subject_id || !university_year || !type) {
        return res.status(400).json({ error: "subject_id, university_year and type are required" });
      }

      const subject = await Subject.findByPk(subject_id);
      if (!subject) {
        return res.status(404).json({ error: "Subject not found" });
      }

      // duplication check
      const existingCourse = await Course.findOne({
        where: {
          teacher_id: req.user.id,
          subject_id,
          university_year,
          type,
          series: series || null,
        },
      });
      if (existingCourse) {
        return res.status(409).json({ error: "Course already exists for this subject, year, type and series" });
      }

      let course_code = generateCourseCode();
      let existing = await Course.findOne({ where: { course_code } });
      while (existing) {
        course_code = generateCourseCode();
        existing = await Course.findOne({ where: { course_code } });
      }

      const course = await Course.create({
        teacher_id: req.user.id,
        subject_id,
        university_year,
        type,
        series,
        course_code,
        start_date,
        end_date,
      });

      // auto-enroll matching students
      if (series) {
        const whereClause = { series };
        if (student_year) whereClause.year = student_year;

        const students = await Student.findAll({ where: whereClause });

        if (students.length > 0) {
          await CourseEnrollment.bulkCreate(
            students.map((s) => ({
              course_id: course.id,
              student_id: s.id,
              enrollment_type: "auto",
            })),
            { ignoreDuplicates: true },
          );
        }
      }

      res.status(201).json({ message: "Course created", course });
    } catch (err) {
      next(err);
    }
  },
  getCourseById: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id },
        include: [{ model: Subject, attributes: ["name", "credits"] }],
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      res.status(200).json(course);
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
  getCourses: async (req, res, next) => {
    try {
      const courses = await Course.findAll({
        where: { teacher_id: req.user.id },
        include: [{ model: Subject, attributes: ["name", "credits"] }],
        order: [["createdAt", "DESC"]],
      });
      res.status(200).json(courses);
    } catch (err) {
      next(err);
    }
  },

  updateCourse: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      await course.update(req.body);

      // sync blueprint dates if course dates changed
      if (req.body.start_date || req.body.end_date) {
        const { Blueprint } = require("../models/index");
        const blueprints = await Blueprint.findAll({
          where: { course_id: req.params.id },
        });

        for (const bp of blueprints) {
          const updatedContent = {
            ...bp.content,
            start_date: req.body.start_date || bp.content.start_date,
            deadline: req.body.end_date || bp.content.deadline,
          };
          await bp.update({ content: updatedContent });
        }
      }

      res.status(200).json({ message: "Course updated", course });
    } catch (err) {
      next(err);
    }
  },

  deleteCourse: async (req, res, next) => {
    try {
      const course = await Course.findOne({
        where: { id: req.params.id, teacher_id: req.user.id },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      await course.update({ is_active: false });
      res.status(200).json({ message: "Course deactivated" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = CourseController;
