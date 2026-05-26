const { Subject } = require("../models/index");

const SubjectController = {
  getSubjects: async (req, res, next) => {
    try {
      const subjects = await Subject.findAll({
        order: [["name", "ASC"]],
      });
      res.status(200).json(subjects);
    } catch (err) {
      next(err);
    }
  },

  createSubject: async (req, res, next) => {
    try {
      const { name, speciality, credits } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const existing = await Subject.findOne({ where: { name } });
      if (existing) {
        return res.status(409).json({ error: "Subject already exists" });
      }

      const subject = await Subject.create({ name, speciality, credits });
      res.status(201).json({ message: "Subject created", subject });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = SubjectController;
