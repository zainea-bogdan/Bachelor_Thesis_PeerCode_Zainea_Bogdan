const { Comment, BlueprintAssignment, Blueprint } = require("../models/index");

const CommentController = {
  addComment: async (req, res, next) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }

      const assignment = await BlueprintAssignment.findByPk(req.params.id, {
        include: [{ model: Blueprint }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // verify access — teacher owns the course or student owns the assignment
      const isTeacher = req.user.role === "teacher" && assignment.blueprint.teacher_id === req.user.id;
      const isStudent = req.user.role === "student" && assignment.student_id === req.user.id;

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ error: "Access denied" });
      }

      const comment = await Comment.create({
        assignment_id: req.params.id,
        author_id: req.user.id,
        author_role: req.user.role,
        content,
      });

      res.status(201).json({ message: "Comment added", comment });
    } catch (err) {
      next(err);
    }
  },

  getComments: async (req, res, next) => {
    try {
      const assignment = await BlueprintAssignment.findByPk(req.params.id, {
        include: [{ model: Blueprint }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // verify access
      const isTeacher = req.user.role === "teacher" && assignment.blueprint.teacher_id === req.user.id;
      const isStudent = req.user.role === "student" && assignment.student_id === req.user.id;

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ error: "Access denied" });
      }

      const comments = await Comment.findAll({
        where: { assignment_id: req.params.id },
        order: [["createdAt", "ASC"]],
      });

      res.status(200).json(comments);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = CommentController;
