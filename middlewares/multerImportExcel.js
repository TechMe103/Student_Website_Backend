const multer = require("multer");

const storage = multer.memoryStorage(); // everything is kept in memory
const upload = multer({ storage });

const uploadMemoryStorage=upload;

module.exports = uploadMemoryStorage;
