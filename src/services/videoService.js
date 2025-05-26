const cacheService = require('./cacheService');
const fileSystemService = require('./fileSystemService');
const logger = require('../config/logger');

class VideoService {
  constructor() {
    this.allowedMimeTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  validateVideoFile(file) {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Tipo de arquivo não suportado. Apenas vídeos são permitidos.');
    }

    if (file.size > this.maxFileSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo permitido: 10MB.');
    }
  }

  async saveVideo(file) {
    this.validateVideoFile(file);
    
    const filename = `${Date.now()}-${file.originalname}`;
    
    await cacheService.set(`video:${filename}`, file.buffer.toString('base64'));
    
    setImmediate(async () => {
      try {
        await fileSystemService.writeFile(filename, file.buffer);
        logger.info(`Vídeo persistido no sistema de arquivos: ${filename}`);
      } catch (error) {
        logger.error(`Erro ao persistir vídeo: ${error.message}`);
      }
    });
    
    logger.info(`Vídeo salvo: ${filename}`);
    return filename;
  }

  async getVideo(filename) {
    const cachedVideo = await cacheService.get(`video:${filename}`);
    if (cachedVideo) {
      logger.debug(`Vídeo servido do cache: ${filename}`);
      return Buffer.from(cachedVideo, 'base64');
    }

    try {
      const buffer = await fileSystemService.readFile(filename);
      
      await cacheService.set(`video:${filename}`, buffer.toString('base64'));
      
      logger.debug(`Vídeo carregado do sistema de arquivos: ${filename}`);
      return buffer;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Arquivo não encontrado');
      }
      throw error;
    }
  }

  async getVideoStats(filename) {
    try {
      return await fileSystemService.getFileStats(filename);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Arquivo não encontrado');
      }
      throw error;
    }
  }

  async getAllVideos() {
    try {
      const files = await fileSystemService.listFiles();
      const videoFiles = [];

      for (const file of files) {
        try {
          const stats = await fileSystemService.getFileStats(file);
          
          videoFiles.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        } catch (error) {
          logger.warn(`Erro ao obter informações do arquivo ${file}: ${error.message}`);
        }
      }

      return videoFiles.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error(`Erro ao listar vídeos: ${error.message}`);
      throw new Error('Erro ao listar vídeos');
    }
  }

  parseRange(range, fileSize) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    return { start, end };
  }
}

module.exports = new VideoService(); 