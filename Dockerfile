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

RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 --gid 1001 app
RUN chown -R app:app /app
USER app

CMD ["npx", "tsx", "server.ts"]
