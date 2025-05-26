const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

class FileSystemService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    this.ensureBaseDir();
  }

  async ensureBaseDir() {
    try {
      await fs.access(this.baseDir);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
      logger.info(`Diretório de storage criado: ${this.baseDir}`);
    }
  }

  async writeFile(filename, buffer) {
    switch (this.storageType) {
      case 'local':
        return this.writeLocalFile(filename, buffer);
      default:
        throw new Error(`Tipo de storage não suportado: ${this.storageType}`);
    }
  }

  async readFile(filename) {
    switch (this.storageType) {
      case 'local':
        return this.readLocalFile(filename);
      default:
        throw new Error(`Tipo de storage não suportado: ${this.storageType}`);
    }
  }

  async getFileStats(filename) {
    switch (this.storageType) {
      case 'local':
        return this.getLocalFileStats(filename);
      default:
        throw new Error(`Tipo de storage não suportado: ${this.storageType}`);
    }
  }

  async listFiles() {
    switch (this.storageType) {
      case 'local':
        return this.listLocalFiles();
      default:
        throw new Error(`Tipo de storage não suportado: ${this.storageType}`);
    }
  }

  async writeLocalFile(filename, buffer) {
    const filepath = path.join(this.baseDir, filename);
    await fs.writeFile(filepath, buffer);
    logger.debug(`Arquivo local salvo: ${filename}`);
  }

  async readLocalFile(filename) {
    const filepath = path.join(this.baseDir, filename);
    return await fs.readFile(filepath);
  }

  async getLocalFileStats(filename) {
    const filepath = path.join(this.baseDir, filename);
    return await fs.stat(filepath);
  }

  async listLocalFiles() {
    return await fs.readdir(this.baseDir);
  }
}

module.exports = new FileSystemService(); 