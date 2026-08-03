FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Persisted JSON "database" lives here - mount a volume in docker-compose
# so users/tasks survive container restarts.
RUN mkdir -p /app/data-volume
VOLUME ["/app/data-volume"]

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
