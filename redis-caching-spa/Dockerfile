# ── Stage 1: build ───────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Restore first (layer-cached until package-lock changes)
COPY package*.json ./
RUN npm ci

COPY . ./

# VITE_API_URL must be the URL the *browser* uses to reach the API.
# Passed as a build-arg so the image can be rebuilt for different environments.
ARG VITE_API_URL=http://localhost:5168
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
