FROM oven/bun

EXPOSE 8080

WORKDIR /front-end

COPY ./package.json /front-end/package.json
RUN bun add .

VOLUME /front-end

CMD ["bun", "run", "dev"]
