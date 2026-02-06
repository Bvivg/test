FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3005

CMD ["node", "dist/index.js"]
