const express = require('express');
const routes = require('./routes/routes');
const cors = require("cors");
const logger = require('./config/logger');
const cacheService = require('./services/cacheService');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', routes);

app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Rota não encontrada'
  });
});

process.on('uncaughtException', (error) => {
  logger.error(`Exceção não tratada: ${error.message}`, { error });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Rejeição não tratada: ${reason}`, { reason });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido, encerrando aplicação...');
  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recebido, encerrando aplicação...');
  await cacheService.disconnect();
  process.exit(0);
});

module.exports = { app };