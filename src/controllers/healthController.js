const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

class HealthController {
  async healthCheck(req, res) {
    try {
      const cacheStatus = await cacheService.healthCheck();
      
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString()
      };

      res.json(health);
    } catch (error) {
      logger.error(`Erro ao obter status do cache: ${error.message}`);
      res.status(500).json({ error: 'Erro ao obter status do cache' });
    }
  }
}

module.exports = new HealthController(); 