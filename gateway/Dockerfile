FROM node:22-bookworm-slim
WORKDIR /app
COPY gateway/package*.json ./
RUN npm install
COPY gateway/ ./
# Add the destination folder name here to keep the structure:
COPY database/ ./database/
EXPOSE 8080
CMD ["npx", "tsx", "src/server.ts"]
