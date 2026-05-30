require("dotenv").config();
const express = require("express");
const { sequelize } = require("./models/index");
const authRoutes = require("./routers/authRouter");
const router = require("./routers/index");

const app = express();
app.use(express.json());

// routes
app.use("/api", router);

// general error handling
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully");
    await sequelize.sync({ force: true });
    console.log("All models synchronized successfully");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
};

start();
