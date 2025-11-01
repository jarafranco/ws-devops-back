# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- production ----------
FROM node:20-alpine
RUN apk update && apk upgrade
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

# Solo copiamos el build (no los node_modules del builder)
COPY --from=builder /usr/src/app/dist ./dist
#COPY .env ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
