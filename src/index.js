const { app } = require('./app');
const logger = require('./config/logger');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    logger.info(`Servidor rodando em http://localhost:${PORT}`);
  });