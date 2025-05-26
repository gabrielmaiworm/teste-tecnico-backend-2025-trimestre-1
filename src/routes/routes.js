const express = require("express");
const videoRoutes = require('./video.routes');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World");
});

router.get("/health", healthController.healthCheck);
router.use('/video', videoRoutes);

module.exports = router;