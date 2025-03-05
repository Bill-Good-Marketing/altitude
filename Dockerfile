# Stage 1: Build the application
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# (Optional) Run your setup script to generate models if needed
RUN node setup.cjs

# Generate the Prisma client (ensure your DATABASE_URL is set via .env or build arguments)
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS runner

# Set the working directory and production environment variable
WORKDIR /app
ENV NODE_ENV=production

# Copy package files and node_modules from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the built Next.js output and public assets from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port 3000 to serve the Next.js app
EXPOSE 3000

# Start the applicationWS
CMD ["npm", "start"]
