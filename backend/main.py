import os
from asyncio import to_thread
from contextlib import asynccontextmanager

from docker.errors import APIError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lib.db import ensure_default
from lib.docker import client, get_images
from lib.response import MISSING_PERMISSION, USER_NOT_FOUND
from routes import docker_router, role_router, user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_default()
    images = await get_images()
    try:
        if all([image.tags[0] != "busybox" for image in images if len(image.tags)]):
            await to_thread(client.images.pull, "busybox")
        if all([image.tags[0] != "javieraviles/zip" for image in images  if len(image.tags)]):
            await to_thread(client.images.pull, "javieraviles/zip")
    except APIError:
        pass
    os.makedirs('temp/', exist_ok=True)
    yield


app = FastAPI(
    title="Simple Docker Dsahboard Backend",
    license_info={"name": "MIT"},
    version="2.0.0",
    summary="A simple backend for Simple Docker Dashboard app. Use FastAPI as framework, SQLite (default) as database, SQLModel for interaction with Database, "
    + "JWT for token, docker-py for interacting with Docker daemon.",
    lifespan=lifespan,
    redirect_slashes=False,
    responses={
        **MISSING_PERMISSION(),
        **USER_NOT_FOUND(),
    },
)

app.include_router(docker_router)
app.include_router(role_router)
app.include_router(user_router)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
