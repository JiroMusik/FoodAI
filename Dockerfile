FROM node:22-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.ts tsconfig.json ./
COPY dist/ dist/

EXPOSE 3000

ENV DB_DIR=/app/data
ENV NODE_ENV=production

CMD ["npx", "tsx", "server.ts"]
