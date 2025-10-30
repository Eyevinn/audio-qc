# Multi-stage build for audio-qc
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /source

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the project
RUN npm run build

# Runtime stage
FROM alpine:3.19

# Install runtime dependencies
RUN apk --no-cache add \
    nodejs \
    npm \
    ffmpeg \
    && adduser --disabled-password --gecos '' audioqc

# Set working directory
WORKDIR /app

# Copy package files and built application
COPY --from=builder /source/package*.json ./
COPY --from=builder /source/dist/ ./dist/

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Install audio-qc globally for CLI access
RUN npm install -g .

# Create directories for user content and staging with proper permissions
RUN mkdir -p /usercontent && \
    chown -R audioqc:audioqc /usercontent /app

# Switch to non-root user
USER audioqc

# Set environment variables
ENV NODE_ENV=production
ENV STAGING_DIR=/usercontent

# Create volume for user content
VOLUME ["/usercontent"]

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER audioqc

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command
CMD ["audio-qc", "--help"]