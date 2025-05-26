const logger = require('../config/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isRedisAvailable = false;
    this.memoryCache = new Map();
    this.cacheTTL = 60; // 60 segundos
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.reconnectDelay = 5000; // 5 segundos
    
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        logger.info('REDIS_URL não configurado. Usando cache em memória.');
        return;
      }

      const redis = require('redis');
      this.client = redis.createClient({ 
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });
      
      this.client.on('error', (err) => {
        logger.warn(`Redis error: ${err.message || 'Conexão falhou'}. Fallback para cache em memória.`);
        this.isRedisAvailable = false;
        this.scheduleReconnect();
      });

      this.client.on('connect', () => {
        logger.info('Conectado ao Redis');
        this.isRedisAvailable = true;
        this.connectionAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('Redis pronto para uso');
        this.isRedisAvailable = true;
      });

      this.client.on('end', () => {
        logger.warn('Conexão Redis encerrada');
        this.isRedisAvailable = false;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.warn(`Falha ao conectar com Redis: ${error.message}. Usando cache em memória.`);
      this.isRedisAvailable = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      logger.info(`Tentativa de reconexão Redis ${this.connectionAttempts}/${this.maxConnectionAttempts} em ${this.reconnectDelay/1000}s`);
      
      setTimeout(() => {
        this.initializeRedis();
      }, this.reconnectDelay);
    } else {
      logger.warn('Máximo de tentativas de reconexão Redis atingido. Continuando apenas com cache em memória.');
    }
  }

  async set(key, value, ttl = this.cacheTTL) {
    try {
      if (this.isRedisAvailable && this.client?.isReady) {
        await this.client.setEx(key, ttl, value);
        logger.debug(`Cache Redis set: ${key}`);
        return;
      }
    } catch (error) {
      logger.warn(`Erro Redis set: ${error.message}. Usando cache em memória.`);
      this.isRedisAvailable = false;
    }

    // Fallback para cache em memória
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000
    });
    
    setTimeout(() => {
      this.memoryCache.delete(key);
      logger.debug(`Cache em memória expirado: ${key}`);
    }, ttl * 1000);
    
    logger.debug(`Cache em memória set: ${key}`);
  }

  async get(key) {
    try {
      if (this.isRedisAvailable && this.client?.isReady) {
        const value = await this.client.get(key);
        if (value) {
          logger.debug(`Cache Redis hit: ${key}`);
          return value;
        }
      }
    } catch (error) {
      logger.warn(`Erro Redis get: ${error.message}. Usando cache em memória.`);
      this.isRedisAvailable = false;
    }

    const entry = this.memoryCache.get(key);
    if (entry && (Date.now() - entry.timestamp) < entry.ttl) {
      logger.debug(`Cache em memória hit: ${key}`);
      return entry.value;
    }
    
    if (entry) {
      this.memoryCache.delete(key);
    }
    
    logger.debug(`Cache miss: ${key}`);
    return null;
  }

  async delete(key) {
    try {
      if (this.isRedisAvailable && this.client?.isReady) {
        await this.client.del(key);
        logger.debug(`Cache Redis removido: ${key}`);
      }
    } catch (error) {
      logger.warn(`Erro Redis delete: ${error.message}`);
    }

    this.memoryCache.delete(key);
    logger.debug(`Cache em memória removido: ${key}`);
  }

  async healthCheck() {
    const status = {
      redis: this.isRedisAvailable,
      memory: true,
      memoryCacheSize: this.memoryCache.size
    };

    if (this.isRedisAvailable && this.client?.isReady) {
      try {
        await this.client.ping();
        status.redisPing = true;
      } catch (error) {
        status.redisPing = false;
        status.redisError = error.message;
      }
    }

    return status;
  }

  async disconnect() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.disconnect();
        logger.info('Desconectado do Redis');
      }
    } catch (error) {
      logger.error(`Erro ao desconectar do Redis: ${error.message}`);
    }
  }
}

module.exports = new CacheService(); 