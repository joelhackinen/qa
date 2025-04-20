FROM redis:7-alpine

WORKDIR /app

COPY redis.conf /usr/local/etc/redis/redis.conf

EXPOSE 6379

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]