FROM oven/bun

WORKDIR /front-end

COPY ./package.json /front-end/package.json
RUN bun add .

COPY . /front-end

CMD ["bun", "start"]
