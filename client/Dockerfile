FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite dev server port (matches vite.config.ts)
EXPOSE 8080
CMD ["npm", "run", "dev"]
