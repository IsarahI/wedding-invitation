# 빌드 컨텍스트는 저장소 루트입니다. (docker-compose.yml 의 context: ..)
FROM node:24-alpine
WORKDIR /app
COPY static ./static
COPY with-guestbook/server ./server
RUN mkdir -p /data /app/dist /conf && chown -R node:node /app /data
ENV NODE_ENV=production PORT=8080 APP_DIR=/app CONF_PATH=/conf/invitation.conf DATA_DIR=/data
EXPOSE 8080
VOLUME /data
USER node
CMD ["node", "server/server.mjs"]
