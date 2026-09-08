# ============================================
# Railway AI Frontend - React + Vite + Node.js
# Multi-stage build for dev and production
# ============================================

# Stage 1: Base image with Node.js
FROM node:20-alpine AS base

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application source
COPY . .

# ============================================
# Stage 2: Development (with hot reload)
# ============================================
FROM base AS development

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ============================================
# Stage 3: Build for production
# ============================================
FROM base AS build

RUN npm run build

# ============================================
# Stage 4: Production (served by Nginx)
# ============================================
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
