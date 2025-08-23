# 🔥 DOCKERFILE FORCE REBUILD - NO CACHE WHATSOEVER
# ===================================================
# Railway cache buster version with timestamp: 2025-08-09-21:46:xx
# This forces complete rebuild by changing base layer

FROM node:18-slim

# Force cache invalidation with current timestamp
ARG CACHE_BUST=20250809214600
RUN echo "Cache bust: $CACHE_BUST"

# Install ALL system dependencies in one layer to avoid cache
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    python3 \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and install Ngrok directly
RUN curl -sSL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    | tar -xz -C /usr/local/bin

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies using package-lock.json
RUN npm ci --only=production --silent

# Copy the rest of application
COPY . .

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Environment setup
ENV NODE_ENV=production
ENV PORT=3000
ENV FORCE_REBUILD=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
