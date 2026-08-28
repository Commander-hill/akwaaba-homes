# Base image
FROM node:20-alpine

# Install OpenSSL for Prisma and build tools for sharp/native modules
RUN apk add --no-cache openssl build-base vips-dev python3

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (clean install)
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start command (pushes schema, runs seed, then starts server)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx prisma db seed && npm start"]
