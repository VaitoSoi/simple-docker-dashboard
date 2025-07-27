# Simple Docker Dashboard

## I. Introduction

This is a simple docker dashboard, which can help you monitor, start, stop or restart your containers.

This also provide you a role-base system for access manager.

## II. Setup

1. Download [Docker](https://www.docker.com/products/docker-desktop/)
2. Pull [this repo](https://github.com/vaitosoi/simple-docker-dashboard/)
3. Edit file `docker.env`:

    ```
    SIGNATURE=<A random string>
    <Keep the rest>
    ```
4. Run `docker compose up`
5. Go to [Dashboard](http://localhost:8080) and use it :D

## III. Components

|Services|Language|Framework|Runtime|Port (default)|
|-|-|-|-|-|
|Backend|Python|[FastAPI](https://fastapi.tiangolo.com/)|[Python](https://www.python.org/)|8000|
|Frontend|TypeScript|[React](https://react.dev/)|[Bun](https://bun.sh)|8080

