# syntax=docker/dockerfile:1.3
FROM python:3.10-alpine as api
RUN addgroup -S abrechnung && adduser -S abrechnung -G abrechnung \
  && apk add --no-cache curl
ADD . /usr/share/abrechnung
RUN pip install --editable /usr/share/abrechnung
ADD --chmod=755 ./docker/entrypoint.py /
COPY --chown=abrechnung:abrechnung ./docker/crontab /var/spool/cron/crontabs/abrechnung
ENTRYPOINT ["/entrypoint.py"]

FROM node:lts as build
ADD frontend/ /build/
RUN cd /build/ && npm install && npx nx build web 

FROM nginx:stable-alpine as frontend
COPY --from=build --chown=nginx:nginx /build/dist/apps/web/ /var/www/abrechnung/
COPY --chown=nginx:nginx frontend/apps/web/src/assets/config.json /var/www/abrechnung/config.json
COPY docker/nginx-static /etc/nginx/conf.d/default.conf

FROM node:lts as node
COPY --chown=node:node frontend/ /frontend/
USER node
WORKDIR /frontend/
RUN npm install
CMD ["npx", "nx", "serve", "web", "--host", "0.0.0.0"]
