# Stage 1: Get Lambda Web Adapter
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 AS adapter

# Stage 2: Build application
FROM public.ecr.aws/docker/library/node:20-alpine

# Copy Lambda Web Adapter from stage 1
COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter

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

# Accept build arguments for environment variables
ARG GHOST_URL
ARG GHOST_CONTENT_API_KEY
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY

# Set environment variables for build
ENV GHOST_URL=$GHOST_URL
ENV GHOST_CONTENT_API_KEY=$GHOST_CONTENT_API_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

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
