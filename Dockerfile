FROM public.ecr.aws/docker/library/node:20-alpine

# Install dependencies for Lambda
RUN apk add --no-cache \
    ca-certificates \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built application
COPY . .

# Build Astro in SSR mode
RUN npm run build

# Expose port 8080 for Lambda
EXPOSE 8080

# Set environment for production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Start the Astro server
CMD ["node", "./dist/server/entry.mjs"]
