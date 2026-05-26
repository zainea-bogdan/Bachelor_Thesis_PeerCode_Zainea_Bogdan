module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "peercode_secret",
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",
};
