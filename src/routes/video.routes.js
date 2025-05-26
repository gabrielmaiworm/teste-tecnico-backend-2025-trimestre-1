const express = require('express');
const multer = require('multer');
const videoController = require('../controllers/videoController');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.post('/upload/video', upload.single('video'), videoController.uploadVideo);
router.get('/static/video/:filename', videoController.streamVideo);
router.get('/list', videoController.listVideos);

module.exports = router; 