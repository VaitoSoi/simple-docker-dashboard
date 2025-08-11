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

## IV. Notes:

While running, backend will pull two images is: `busybox` (for inspecting files, folder) and `javieraviles/zip` (for zipping file). Please don't remove two images or you will have to wait every time you go to the `Volumes` page. Also don't delete the `temp` folder, it is the place where backend will put the file pulled from the volume