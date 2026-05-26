const fs = require("fs");
const path = require("path");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "../uploads");

// create uploads folder if it doesn't exist
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

const gcsService = {
  uploadFile: async (fileBuffer, filename, mimetype) => {
    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = path.join(LOCAL_UPLOAD_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    // return a path that mimics GCS object path
    return `uploads/${uniqueFilename}`;
  },

  deleteFile: async (filePath) => {
    const fullPath = path.join(__dirname, "..", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  },
};

module.exports = gcsService;
