const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

class VideoService {
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.cache = new Map();
    this.cacheTTL = 60 * 1000; // 60 segundos
    this.ensureUploadsDir();
  }

  async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      logger.info(`Diretório de uploads criado: ${this.uploadsDir}`);
    }
  }

  validateVideoFile(file) {
    const allowedMimeTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Tipo de arquivo não suportado. Apenas vídeos são permitidos.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo permitido: 10MB.');
    }
  }

  async saveVideo(file) {
    this.validateVideoFile(file);
    
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(this.uploadsDir, filename);
    
    await fs.writeFile(filepath, file.buffer);
    
    this.setCacheEntry(filename, file.buffer);
    
    logger.info(`Vídeo salvo: ${filename}`);
    return filename;
  }

  setCacheEntry(filename, buffer) {
    const cacheEntry = {
      buffer,
      timestamp: Date.now()
    };
    this.cache.set(filename, cacheEntry);
    
    setTimeout(() => {
      this.cache.delete(filename);
      logger.debug(`Cache expirado para: ${filename}`);
    }, this.cacheTTL);
  }

  async getVideo(filename) {
    const cacheEntry = this.cache.get(filename);
    
    if (cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheTTL) {
      logger.debug(`Vídeo servido do cache: ${filename}`);
      return cacheEntry.buffer;
    }

    const filepath = path.join(this.uploadsDir, filename);
    
    try {
      const buffer = await fs.readFile(filepath);
      this.setCacheEntry(filename, buffer);
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
    const filepath = path.join(this.uploadsDir, filename);
    
    try {
      const stats = await fs.stat(filepath);
      return stats;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Arquivo não encontrado');
      }
      throw error;
    }
  }

  parseRange(range, fileSize) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    return { start, end };
  }

  async getAllVideos() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const videoFiles = [];

      for (const file of files) {
        try {
          const filepath = path.join(this.uploadsDir, file);
          const stats = await fs.stat(filepath);
          
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
}

module.exports = new VideoService(); 