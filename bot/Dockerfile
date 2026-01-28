FROM node:20-alpine

# Install dependencies for node-canvas and fonts
RUN apk add --no-cache \
    build-base \
    g++ \
    python3 \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    fontconfig-dev \
    font-noto \
    ttf-dejavu \
    ttf-liberation \
    ttf-freefont

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
