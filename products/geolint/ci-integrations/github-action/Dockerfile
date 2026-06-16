FROM node:20-alpine

WORKDIR /action

COPY src/package.json .
RUN npm install --production

COPY src/ .

ENTRYPOINT ["node", "index.js"]
