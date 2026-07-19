FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Bind mount replaces /app but anonymous volume keeps node_modules; re-install so new deps in package.json appear without rebuilding the image.
CMD ["sh", "-c", "npm install && npm run start:dev"]
