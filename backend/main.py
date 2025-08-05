from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lib.db import ensure_default
from lib.response import MISSING_PERMISSION, USER_NOT_FOUND
from routes import docker_router, role_router, user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_default()
    yield


app = FastAPI(
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
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
