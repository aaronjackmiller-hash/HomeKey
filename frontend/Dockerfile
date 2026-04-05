# Use Node 18 LTS for building
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# react-scripts 4 requires the legacy OpenSSL provider on Node 17+
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV CI=false

RUN npm run build

# Serve with Nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]