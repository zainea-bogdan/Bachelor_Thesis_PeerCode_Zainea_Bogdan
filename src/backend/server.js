require("dotenv").config();
const express = require("express");
const { sequelize } = require("./models/index");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully");

    await sequelize.sync({ alter: true });
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
