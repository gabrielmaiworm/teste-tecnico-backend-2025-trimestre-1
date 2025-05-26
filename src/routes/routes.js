const express = require("express");
const videoRoutes = require('./video.routes');

const router = express.Router();

router.use('/video', videoRoutes);

module.exports = router;