FROM node:22-bookworm-slim
WORKDIR /app
COPY gateway/package*.json ./
RUN npm install
COPY gateway/ .
COPY Config.env ./Config.env
EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]
