FROM oven/bun

ENV DASHBOARD_PORT=8080
EXPOSE 8080

WORKDIR /front-end

COPY ./package.json /front-end/package.json
RUN bun add .

COPY . /front-end

CMD ["bun", "start", "--port", "${DASHBOARD_PORT}"]
