# trafficvision-backend/Dockerfile
FROM node:20-slim

WORKDIR /app

# Copy only package files first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

# Don't bake .env into the image — it's provided at runtime
# (already gitignored, and Docker respects .dockerignore too)

EXPOSE 5000

CMD ["node", "server.js"]