# Base image
FROM node:20-alpine

# Install OpenSSL for Prisma and build tools for sharp/native modules
RUN apk add --no-cache openssl build-base vips-dev python3

# Set environment variables
ENV PORT=7860
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (clean install)
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript application
RUN npm run build

# Ensure node user (UID 1000) owns the application directory for Hugging Face Spaces permissions
RUN chown -R node:node /app

# Switch to non-root user (Hugging Face Spaces executes as UID 1000)
USER node

# Expose port 7860 (Hugging Face Spaces default) and 5000
EXPOSE 7860
EXPOSE 5000

# Start command (pushes schema, runs seed, then starts server)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx prisma db seed && npm start"]
