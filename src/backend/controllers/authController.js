const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Teacher, Student } = require("../models/index");
const { JWT_SECRET, JWT_EXPIRY } = require("../config/auth");

const SALT_ROUNDS = 10;

const AuthController = {
  register: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (!["teacher", "student"].includes(role)) {
        return res.status(400).json({ error: "Role must be teacher or student" });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      let user;
      if (role === "teacher") {
        const existing = await Teacher.findOne({ where: { email } });
        if (existing) return res.status(409).json({ error: "Email already in use" });
        user = await Teacher.create({ name, email, password_hash });
      } else {
        const existing = await Student.findOne({ where: { email } });
        if (existing) return res.status(409).json({ error: "Email already in use" });
        user = await Student.create({ name, email, password_hash });
      }

      const token = jwt.sign({ id: user.id, role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      res.status(201).json({
        message: "Registration successful",
        token,
        user: { id: user.id, name: user.name, email: user.email, role },
      });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password, role } = req.body;

      if (!email || !password || !role) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (!["teacher", "student"].includes(role)) {
        return res.status(400).json({ error: "Role must be teacher or student" });
      }

      let user;
      if (role === "teacher") {
        user = await Teacher.findOne({ where: { email } });
      } else {
        user = await Student.findOne({ where: { email } });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      res.status(200).json({
        message: "Login successful",
        token,
        user: { id: user.id, name: user.name, email: user.email, role },
      });
    } catch (err) {
      next(err);
    }
  },

  me: async (req, res, next) => {
    try {
      let user;
      if (req.user.role === "teacher") {
        user = await Teacher.findByPk(req.user.id, {
          attributes: { exclude: ["password_hash"] },
        });
      } else {
        user = await Student.findByPk(req.user.id, {
          attributes: { exclude: ["password_hash"] },
        });
      }

      if (!user) return res.status(404).json({ error: "User not found" });

      res.status(200).json({ ...user.toJSON(), role: req.user.role });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
