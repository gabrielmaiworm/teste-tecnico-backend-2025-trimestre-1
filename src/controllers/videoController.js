const videoService = require('../services/videoService');
const logger = require('../config/logger');

class VideoController {
  async uploadVideo(req, res) {
    try {
      if (!req.file) {
        logger.warn('Tentativa de upload sem arquivo');
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const filename = await videoService.saveVideo(req.file);
      logger.info(`Upload realizado com sucesso: ${filename}`);
      
      res.status(204).send();
    } catch (error) {
      logger.error(`Erro no upload: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      const range = req.headers.range;

      if (!range) {
        const buffer = await videoService.getVideo(filename);
        
        res.writeHead(200, {
          'Content-Length': buffer.length,
          'Content-Type': 'video/mp4',
        });
        
        res.end(buffer);
        logger.info(`Vídeo completo servido: ${filename}`);
        return;
      }

      const stats = await videoService.getVideoStats(filename);
      const fileSize = stats.size;
      const { start, end } = videoService.parseRange(range, fileSize);
      
      const chunkSize = (end - start) + 1;
      const buffer = await videoService.getVideo(filename);
      const chunk = buffer.slice(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      res.end(chunk);
      logger.info(`Chunk servido: ${filename} (${start}-${end}/${fileSize})`);
      
    } catch (error) {
      if (error.message === 'Arquivo não encontrado') {
        logger.warn(`Arquivo não encontrado: ${req.params.filename}`);
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }
      
      logger.error(`Erro no streaming: ${error.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listVideos(req, res) {
    try {
      const videos = await videoService.getAllVideos();
      logger.info(`Lista de vídeos solicitada - ${videos.length} vídeos encontrados`);
      
      res.status(200).json({
        count: videos.length,
        videos
      });
    } catch (error) {
      logger.error(`Erro ao listar vídeos: ${error.message}`);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new VideoController(); 