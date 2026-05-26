const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", authMiddleware, AuthController.me);

module.exports = router;
