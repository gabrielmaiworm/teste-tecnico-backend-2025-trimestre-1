FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p uploads logs && \
    chown -R node:node /app

USER node

EXPOSE 3000

CMD ["dumb-init", "node", "src/index.js"] 