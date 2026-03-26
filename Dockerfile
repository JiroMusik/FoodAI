FROM node:22-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server.ts tsconfig.json ingredient-aliases.json ./
COPY --chown=node:node dist/ dist/

RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000

ENV DB_DIR=/app/data
ENV NODE_ENV=production

CMD ["npx", "tsx", "server.ts"]
