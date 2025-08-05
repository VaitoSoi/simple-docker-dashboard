from asyncio import to_thread
from queue import Empty
from typing import Annotated, Any, Awaitable, Callable, Union, cast

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)
from fastapi.responses import JSONResponse
from fastapi.websockets import WebSocketState

from lib.docker import (
    FormattedContainer,
    FormattedImage,
    ResourceUsage,
    ResourceUsages,
    delete_image,
    docker_logs_stream,
    get_container,
    get_containers,
    get_image,
    get_images,
    get_resource_usage,
    get_resource_usages,
    inspect_container,
    kill_container,
    remove_container,
    rename_container,
    restart_container,
    start_container,
    stop_container,
    top_container,
)
from lib.enums import Permission
from lib.errors import ContainerNotFound, ImageNotFound
from lib.response import HTTP_EXECEPTION_MESSAGE, MESSAGE_OK
from lib.security import (
    check_user_has_permission,
    get_user_from_token,
    token_has_permission,
)

router = APIRouter(prefix="/docker", tags=["docker"])

"""
CONTAINER
"""

CONTAINER_NOT_FOUND = {
    404: HTTP_EXECEPTION_MESSAGE(
        "container not found", ({"id": {"type": "string"}}, {"id": "string"})
    )
}


async def container_raise_if_not_found(
    func: Callable[..., Awaitable[Any]], *args: ..., **kwargs: ...
):
    try:
        return await func(*args, **kwargs)

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "container not found",
                **({"id": kwargs["id"]} if "id" in kwargs else {}),
            },
        )


@router.get(
    "/containers",
    description="Get all containers",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
    responses={200: {"model": list[FormattedContainer]}},
)
async def get_containers_api(show_all: bool = False):
    return await get_containers(show_all)


@router.get(
    "/container",
    description="Get specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
    responses={200: {"model": FormattedContainer}, **CONTAINER_NOT_FOUND},
)
async def get_container_api(id: str):
    return await container_raise_if_not_found(get_container, id=id)


@router.get(
    "/inspect",
    description="Get specific container attributes by ID, Short ID or ",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
    responses={200: {"model": dict[str, Any]}, **CONTAINER_NOT_FOUND},
)
async def inspect_container_api(id: str):
    return await container_raise_if_not_found(inspect_container, id=id)


@router.get(
    "/top",
    description="Get specific container running process by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
    responses={200: {"model": list[dict[str, str]]}, **CONTAINER_NOT_FOUND},
)
async def top_container_api(id: str):
    return (
        cast(
            list[dict[str, str]],
            await container_raise_if_not_found(top_container, id=id),
        )
        or []
    )


@router.post(
    "/start",
    description="Start specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.StartContainer]))],
    responses={200: MESSAGE_OK(), **CONTAINER_NOT_FOUND},
)
async def start_container_api(id: str):
    await container_raise_if_not_found(start_container, id=id)
    return JSONResponse({"message": "ok"})


@router.post(
    "/stop",
    description="Stop specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.StopContainer]))],
    responses={200: MESSAGE_OK(), **CONTAINER_NOT_FOUND},
)
async def stop_container_api(id: str):
    await container_raise_if_not_found(stop_container, id=id)
    return JSONResponse({"message": "ok"})


@router.post(
    "/rename",
    description="Rename specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.RenameContainer]))],
    responses={200: MESSAGE_OK(), **CONTAINER_NOT_FOUND},
)
async def rename_container_api(id: str, new_name: str):
    await container_raise_if_not_found(rename_container, id=id, new_name=new_name)
    return JSONResponse({"message": "ok"})


@router.post(
    "/restart",
    description="Restart specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.RestartContainer]))],
    responses={200: MESSAGE_OK(), **CONTAINER_NOT_FOUND},
)
async def restart_container_api(id: str):
    await container_raise_if_not_found(restart_container, id=id)
    return JSONResponse({"message": "ok"})


@router.post(
    "/kill",
    description="Kill specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.KillContainer]))],
    responses={200: MESSAGE_OK(), **CONTAINER_NOT_FOUND},
)
async def kill_container_api(id: str):
    await container_raise_if_not_found(kill_container, id=id)
    return JSONResponse({"message": "ok"})


@router.delete(
    "/container",
    description="Remove specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.RemoveContainer]))],
    responses={200: MESSAGE_OK(), **CONTAINER_NOT_FOUND},
)
async def remove_container_api(id: str):
    await container_raise_if_not_found(remove_container, id=id)
    return JSONResponse({"message": "ok"})


@router.websocket("/logs")
async def get_container_logs_api(
    ws: WebSocket,
    id: Annotated[str, Query()],
    token: Annotated[str, Query()],
    tail: Annotated[int | None, Query()] = None,
):
    check_user_has_permission(get_user_from_token(token), [Permission.SeeLogs])

    try:
        log_queue, log_stream = await docker_logs_stream(id, tail=tail)

        await ws.accept()
        try:
            while ws.application_state == WebSocketState.CONNECTING:
                ...

            while ws.application_state == WebSocketState.CONNECTED:
                try:
                    log = await to_thread(log_queue.get, timeout=1)
                except Empty:
                    await ws.send_text("SimpleDockerDashboard_Ping")
                    continue

                if log:
                    if log == "SimpleDockerDashboard_EOL":
                        log_stream.close()
                        break

                    await ws.send_text(log)

            log_stream.close()
            await ws.close()

        except (WebSocketDisconnect, WebSocketException):
            log_stream.close()

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


"""
IMAGE
"""


IMAGE_NOT_FOUND = {
    404: HTTP_EXECEPTION_MESSAGE(
        "image not found", ({"id": {"type": "string"}}, {"id": "string"})
    )
}


async def image_raise_if_not_found(
    func: Callable[..., Awaitable[Any]], *args: ..., **kwargs: ...
):
    try:
        return await func(*args, **kwargs)

    except ImageNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "image not found",
                **({"id": kwargs["id"]} if "id" in kwargs else {}),
            },
        )


@router.get(
    "/images",
    description="Get all images",
    dependencies=[Depends(token_has_permission([Permission.SeeImages]))],
    responses={200: {"model": list[FormattedImage]}},
)
async def get_images_api():
    return await get_images()


@router.get(
    "/image",
    description="Get specific image by ID or Short ID",
    dependencies=[Depends(token_has_permission([Permission.SeeImages]))],
    responses={200: {"model": FormattedContainer}, **IMAGE_NOT_FOUND},
)
async def get_image_api(id: str):
    return await image_raise_if_not_found(get_image, id=id)


@router.delete(
    "/image",
    description="Remove specific image by ID or Short ID",
    dependencies=[Depends(token_has_permission([Permission.DeleteImage]))],
    responses={200: MESSAGE_OK(), **IMAGE_NOT_FOUND},
)
async def delete_image_api(id: str):
    await image_raise_if_not_found(delete_image, id=id)
    return JSONResponse({"message": "ok"})


@router.get(
    "/resource",
    description="Get resource usage by Docker and system",
    dependencies=[Depends(token_has_permission([Permission.Resource]))],
    responses={200: {"model": Union[ResourceUsages, ResourceUsage]}, **CONTAINER_NOT_FOUND},
)
async def get_resource(id: str | None = None):
    if not id:
        return await get_resource_usages()
    else:
        return await container_raise_if_not_found(get_resource_usage, id=id)
