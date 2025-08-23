# RAILWAY DOCKERFILE - NO CACHE VERSION
FROM node:18-alpine

# Install system dependencies for Ngrok
RUN apk add --no-cache curl bash python3 make g++

# Install Ngrok
RUN curl -s https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz | tar xzf - -C /usr/local/bin

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm install (not npm ci)
RUN npm install --production --no-audit --no-fund

# Copy application code
COPY . .

# Set permissions
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start command - use npm start to trigger railway-ngrok-integration.js
CMD ["npm", "start"]
