FROM node:24-alpine

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 10000

CMD ["node", "index.js"]
RUN ffmpeg -version && ffprobe -version
