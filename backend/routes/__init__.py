from .docker import router as docker_router
from .role import router as role_router
from .user import router as user_router

__all__ = [
    "docker_router",
    "role_router",
    "user_router",
]