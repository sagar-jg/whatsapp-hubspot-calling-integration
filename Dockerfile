# Multi-stage Docker build for WhatsApp HubSpot Calling Integration

# Backend Stage
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# Frontend Stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build frontend
ARG REACT_APP_API_URL=http://localhost:3000
ARG REACT_APP_WEBSOCKET_URL=ws://localhost:3000
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WEBSOCKET_URL=$REACT_APP_WEBSOCKET_URL

RUN npm run build

# Production Stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S app -u 1001

# Copy backend from builder
COPY --from=backend-builder --chown=app:nodejs /app/backend ./backend

# Copy frontend build from builder
COPY --from=frontend-builder --chown=app:nodejs /app/frontend/build ./frontend/build

# Create logs directory
RUN mkdir -p backend/logs && chown app:nodejs backend/logs

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/src/utils/healthcheck.js

# Start the application
WORKDIR /app/backend
CMD ["dumb-init", "node", "src/index.js"]