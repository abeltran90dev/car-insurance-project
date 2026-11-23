FROM node:22-alpine
WORKDIR /app

# better-sqlite3 may need a toolchain when no prebuilt binary matches
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# SQLite file and uploads live on volumes (see docker-compose.yml)
ENV DATABASE_CLIENT=sqlite \
    DATABASE_FILENAME=../data/data.db \
    HOST=0.0.0.0 \
    PORT=1337
VOLUME ["/data", "/app/public/uploads"]
EXPOSE 1337

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
