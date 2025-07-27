FROM oven/bun

WORKDIR /front-end

COPY ./package.json /front-end/package.json
RUN bun add .

COPY . /front-end

CMD ["sh", "-c", "bun start --port=$DASHBOARD_PORT"]
