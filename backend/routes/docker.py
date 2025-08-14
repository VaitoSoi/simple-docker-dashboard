import traceback
from asyncio import to_thread
from queue import Empty, Queue
from typing import Annotated, Any, Awaitable, Callable, TypeVar, Union, cast

from docker.errors import APIError
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
from fastapi.responses import JSONResponse, Response
from fastapi.websockets import WebSocketState

from lib.db import User
from lib.docker import (
    ContainerPruneResponse,
    DirEntry,
    FormattedContainer,
    FormattedImage,
    FormattedNetwork,
    FormattedVolume,
    ImagePruneResponse,
    ResourceUsage,
    ResourceUsages,
    VolumePruneResponse,
    connect_container,
    container_cat,
    container_download,
    container_ls,
    disconnect_container,
    docker_logs_stream,
    get_container,
    get_container_raw,
    get_containers,
    get_containers_raw,
    get_docker_exec,
    get_image,
    get_images,
    get_network,
    get_networks,
    get_resource_usage,
    get_resource_usages,
    get_volume,
    get_volumes,
    inspect_container,
    kill_container,
    prune_container,
    prune_images,
    prune_network,
    prune_volumes,
    remove_container,
    remove_image,
    remove_network,
    remove_volume,
    rename_container,
    restart_container,
    start_container,
    stop_container,
    top_container,
    volume_cat,
    volume_download,
    volume_ls,
)
from lib.enums import Permission
from lib.errors import (
    ContainerNotFound,
    ImageNotFound,
    InvalidPath,
    NetworkNotFound,
    TerminalNotFound,
    VolumeNotFound,
)
from lib.response import HTTP_EXECEPTION_MESSAGE, MESSAGE_OK
from lib.security import (
    check_user_has_permission,
    get_user_from_token,
    token_has_permission,
)

API_ERROR = {400: HTTP_EXECEPTION_MESSAGE("<any api error message>")}

router = APIRouter(prefix="/docker", tags=["docker"], responses={**API_ERROR})

T = TypeVar("T")


async def raise_if_api_error(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await func(*args, **kwargs)

    except APIError as api_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": api_error.response.reason
                if api_error.response
                else api_error.explanation,
            },
        )


def HTTP_NOT_FOUND_WITH_ID(message: str):
    return HTTP_EXECEPTION_MESSAGE(
        message, ({"id": {"type": "string"}}, {"id": "string"})
    )


"""
CONTAINER
"""

CONTAINER_NOT_FOUND = {404: HTTP_NOT_FOUND_WITH_ID("container not found")}

container_router = APIRouter(prefix="/container", responses={**CONTAINER_NOT_FOUND})


async def container_raise_if_not_found(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await raise_if_api_error(func, *args, **kwargs)

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "container not found",
                **({"id": kwargs["id"]} if "id" in kwargs else {}),
            },
        )


@container_router.get(
    "s",
    description="Get all containers",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
    responses={200: {"model": list[FormattedContainer]}},
)
async def get_containers_api(
    user: Annotated[User, Depends(get_user_from_token)],
    show_all: bool = False,
    raw: bool = False,
):
    if raw:
        check_user_has_permission(user, [Permission.SeeContainerRaw])
        return JSONResponse(
            [
                container.attrs
                for container in await raise_if_api_error(get_containers_raw)
            ]
        )
    return await raise_if_api_error(get_containers, show_all)


@container_router.get(
    "",
    description="Get specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
    responses={200: {"model": FormattedContainer}},
)
async def get_container_api(
    user: Annotated[User, Depends(get_user_from_token)], id: str, raw: bool = False
):
    if raw:
        check_user_has_permission(user, [Permission.SeeContainerRaw])
    return await container_raise_if_not_found(
        get_container if not raw else get_container_raw, id=id
    )


@container_router.get(
    "/inspect",
    description="Get specific container attributes by ID, Short ID or ",
    dependencies=[Depends(token_has_permission([Permission.InspectContainer]))],
    responses={200: {"model": dict[str, Any]}},
)
async def inspect_container_api(id: str):
    return await container_raise_if_not_found(inspect_container, id=id)


@container_router.get(
    "/top",
    description="Get specific container running process by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.InspectContainer]))],
    responses={200: {"model": list[dict[str, str]]}},
)
async def top_container_api(id: str):
    return (
        cast(
            list[dict[str, str]],
            await container_raise_if_not_found(top_container, id=id),
        )
        or []
    )


@container_router.get(
    "/ls",
    description="List all entries in volume",
    dependencies=[Depends(token_has_permission([Permission.LsVolume]))],
    responses={200: {"model": list[DirEntry]}},
)
async def ls_container_api(id: str, path: str = ""):
    return await container_raise_if_not_found(container_ls, id=id, path=path)


@container_router.get(
    "/cat",
    description="Cat an entry in volume",
    dependencies=[Depends(token_has_permission([Permission.CatVolume]))],
    responses={200: {"model": list[DirEntry]}},
)
async def cat_container_api(id: str, path: str):
    return await container_raise_if_not_found(container_cat, id=id, path=path)


@container_router.get(
    "/download",
    description="Download an entry in volume",
    dependencies=[Depends(token_has_permission([Permission.DownloadVolume]))],
    responses={200: {}},
)
async def download_container_api(id: str, path: str):
    return Response(
        content=await container_raise_if_not_found(
            container_download, id=id, path=path
        ),
        media_type="application/octet-stream",
    )


@container_router.post(
    "/start",
    description="Start specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.StartContainer]))],
    responses={200: MESSAGE_OK()},
)
async def start_container_api(id: str):
    await container_raise_if_not_found(start_container, id=id)
    return JSONResponse({"message": "ok"})


@container_router.post(
    "/stop",
    description="Stop specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.StopContainer]))],
    responses={200: MESSAGE_OK()},
)
async def stop_container_api(id: str):
    await container_raise_if_not_found(stop_container, id=id)
    return JSONResponse({"message": "ok"})


@container_router.post(
    "/rename",
    description="Rename specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.RenameContainer]))],
    responses={200: MESSAGE_OK()},
)
async def rename_container_api(id: str, new_name: str):
    await container_raise_if_not_found(rename_container, id=id, new_name=new_name)
    return JSONResponse({"message": "ok"})


@container_router.post(
    "/restart",
    description="Restart specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.RestartContainer]))],
    responses={200: MESSAGE_OK()},
)
async def restart_container_api(id: str):
    await container_raise_if_not_found(restart_container, id=id)
    return JSONResponse({"message": "ok"})


@container_router.post(
    "/kill",
    description="Kill specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.KillContainer]))],
    responses={200: MESSAGE_OK()},
)
async def kill_container_api(id: str):
    await container_raise_if_not_found(kill_container, id=id)
    return JSONResponse({"message": "ok"})


@container_router.delete(
    "",
    description="Remove specific container by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.RemoveContainer]))],
    responses={200: MESSAGE_OK()},
)
async def remove_container_api(id: str):
    await container_raise_if_not_found(remove_container, id=id)
    return JSONResponse({"message": "ok"})


@container_router.delete(
    "/prune",
    description="Prune container",
    dependencies=[Depends(token_has_permission([Permission.PruneContainer]))],
    responses={200: {"model": ContainerPruneResponse}},
)
async def prune_container_api():
    return await raise_if_api_error(prune_container)


@container_router.websocket("/logs")
async def get_container_logs_api(
    ws: WebSocket,
    id: Annotated[str, Query()],
    token: Annotated[str, Query()],
    tail: Annotated[int | None, Query()] = None,
):
    check_user_has_permission(get_user_from_token(token), [Permission.SeeLogs])

    log_queue, log_stream = await container_raise_if_not_found(
        docker_logs_stream, id, tail=tail
    )

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


@container_router.websocket("/exec")
async def container_exec_api(
    ws: WebSocket,
    id: Annotated[str, Query()],
    token: Annotated[str, Query()],
):
    try:
        check_user_has_permission(get_user_from_token(token), [Permission.SeeLogs])

        input = Queue[bytes]()

        try:
            output, event, task = await container_raise_if_not_found(
                get_docker_exec, id=id, input=input
            )

        except TerminalNotFound:
            raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)

        await ws.accept()

        def close():
            event.set()
            task.cancel()

        try:
            while ws.application_state == WebSocketState.CONNECTING:
                ...

            while ws.application_state == WebSocketState.CONNECTED:
                data = await ws.receive_json()
                str_command: str | None = data["command"]
                if str_command is None:
                    continue

                str_command = str_command.rstrip("\n")

                try:
                    byte_command = bytes.fromhex(str_command)

                except ValueError:
                    byte_command = str_command.encode()

                await to_thread(input.put, byte_command)

                while True:
                    try:
                        resp = await to_thread(output.get, timeout=5)
                    except Empty:
                        await ws.send_json({})
                        continue

                    await ws.send_json(resp.model_dump())
                    break

            close()
            await ws.close()
        except (WebSocketDisconnect, WebSocketException):
            close()

    except Exception:
        print(traceback.format_exc())


@container_router.get(
    "/resource",
    description="Get resource usage by Docker and system",
    dependencies=[Depends(token_has_permission([Permission.Resource]))],
    responses={
        200: {"model": Union[ResourceUsages, ResourceUsage]},
        **CONTAINER_NOT_FOUND,
    },
)
async def get_resource(id: str | None = None):
    if not id:
        return await get_resource_usages()
    else:
        return await container_raise_if_not_found(get_resource_usage, id=id)


"""
IMAGE
"""


IMAGE_NOT_FOUND = {404: HTTP_NOT_FOUND_WITH_ID("image not found")}

image_router = APIRouter(prefix="/image", responses={**IMAGE_NOT_FOUND})


async def image_raise_if_not_found(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await raise_if_api_error(func, *args, **kwargs)

    except ImageNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "image not found",
                **({"id": kwargs["id"]} if "id" in kwargs else {}),
            },
        )


@image_router.get(
    "s",
    description="Get all images",
    dependencies=[Depends(token_has_permission([Permission.SeeImages]))],
    responses={200: {"model": list[FormattedImage]}},
)
async def get_images_api():
    return await raise_if_api_error(get_images)


@image_router.get(
    "",
    description="Get specific image by ID or Short ID",
    dependencies=[Depends(token_has_permission([Permission.SeeImages]))],
    responses={200: {"model": FormattedContainer}},
)
async def get_image_api(id: str):
    return await image_raise_if_not_found(get_image, id=id)


@image_router.delete(
    "",
    description="Remove specific image by ID or Short ID",
    dependencies=[Depends(token_has_permission([Permission.DeleteImage]))],
    responses={200: MESSAGE_OK()},
)
async def delete_image_api(id: str):
    await image_raise_if_not_found(remove_image, id=id)
    return JSONResponse({"message": "ok"})


@image_router.delete(
    "/prune",
    description="Prune image",
    dependencies=[Depends(token_has_permission([Permission.PruneImage]))],
    responses={200: {"model": ImagePruneResponse}},
)
async def prune_image_api(dangling: bool = True):
    return await raise_if_api_error(prune_images, dangling)


"""
VOLUMES
"""

VOLUME_NOT_FOUND = {404: HTTP_NOT_FOUND_WITH_ID("volume not found")}

INVALID_PATH = {
    400: HTTP_EXECEPTION_MESSAGE(
        "invalid path", ({"path": {"type": "string"}}, {"path": "string"})
    )
}

volume_router = APIRouter(
    prefix="/volume", responses={**VOLUME_NOT_FOUND, **INVALID_PATH}
)


async def volume_raise_if_not_found(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await raise_if_api_error(func, *args, **kwargs)

    except VolumeNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "volume not found",
                **({"id": kwargs["id"]} if "id" in kwargs else {}),
            },
        )


async def volume_raise_if_invalid(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await volume_raise_if_not_found(func, *args, **kwargs)

    except InvalidPath:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "invalid path",
                **({"path": kwargs["path"]} if "path" in kwargs else {}),
            },
        )


@volume_router.get(
    "s",
    description="Get all volume",
    dependencies=[Depends(token_has_permission([Permission.SeeVolumes]))],
    responses={200: {"model": list[FormattedVolume]}},
)
async def get_volumes_api():
    return await get_volumes()


@volume_router.get(
    "",
    description="Get specific volume by ID, Short ID or Name",
    dependencies=[Depends(token_has_permission([Permission.SeeVolumes]))],
    responses={200: {"model": FormattedVolume}},
)
async def get_volume_api(id: str):
    return await volume_raise_if_not_found(get_volume, id=id)


@volume_router.get(
    "/ls",
    description="List all entries in volume",
    dependencies=[Depends(token_has_permission([Permission.LsVolume]))],
    responses={200: {"model": list[DirEntry]}},
)
async def ls_volume_api(id: str, path: str = ""):
    return await volume_raise_if_invalid(volume_ls, id=id, path=path)


@volume_router.get(
    "/cat",
    description="Cat an entry in volume",
    dependencies=[Depends(token_has_permission([Permission.CatVolume]))],
    responses={200: {"model": list[DirEntry]}},
)
async def cat_volume_api(id: str, path: str):
    return await volume_raise_if_invalid(volume_cat, id=id, path=path)


@volume_router.get(
    "/download",
    description="Download an entry in volume",
    dependencies=[Depends(token_has_permission([Permission.DownloadVolume]))],
    responses={200: {}},
)
async def download_volume_api(id: str, path: str):
    return Response(
        content=await volume_raise_if_invalid(volume_download, id=id, path=path),
        media_type="application/octet-stream",
    )


@volume_router.delete(
    "",
    description="Remove specific volume by ID or Short ID",
    dependencies=[Depends(token_has_permission([Permission.DeleteVolume]))],
    responses={200: MESSAGE_OK()},
)
async def delete_volume_api(id: str):
    await volume_raise_if_not_found(remove_volume, id=id)
    return JSONResponse({"message": "ok"})


@volume_router.delete(
    "/prune",
    description="Prune volume",
    dependencies=[Depends(token_has_permission([Permission.PruneVolume]))],
    responses={200: {"model": VolumePruneResponse}},
)
async def prune_volume_api():
    return await raise_if_api_error(prune_volumes)


"""
NETWORKS
"""

NETWORK_NOT_FOUND = {404: HTTP_NOT_FOUND_WITH_ID("network not found")}

network_router = APIRouter(prefix="/network", responses={**NETWORK_NOT_FOUND})


async def network_raise_if_not_found(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await raise_if_api_error(func, *args, **kwargs)

    except NetworkNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "network not found",
                **({"id": kwargs["id"]} if "id" in kwargs else {}),
            },
        )


@network_router.get(
    "s",
    description="Get all network",
    dependencies=[Depends(token_has_permission([Permission.SeeNetworks]))],
    responses={200: {"model": list[FormattedNetwork]}},
)
async def get_networks_api():
    return await get_networks()


@network_router.get(
    "",
    description="Get specific network by ID",
    dependencies=[Depends(token_has_permission([Permission.SeeNetworks]))],
    responses={200: {"model": FormattedNetwork}},
)
async def get_network_api(id: str):
    return await network_raise_if_not_found(get_network, id)


@network_router.post(
    "/connect",
    description="Disconnect a container from network",
    dependencies=[Depends(token_has_permission([Permission.ConnectContainer]))],
    responses={200: MESSAGE_OK()},
)
async def connect_container_api(
    network_id: str, container_id: str
):
    try:
        await network_raise_if_not_found(
            connect_container, network_id, container_id
        )
        return JSONResponse({"message": "ok"})
    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "container not found",
                "id": container_id,
            },
        )


@network_router.delete(
    "/disconnect",
    description="Disconnect a container from network",
    dependencies=[Depends(token_has_permission([Permission.DisconnectContainer]))],
    responses={200: MESSAGE_OK()},
)
async def disconnect_container_api(
    network_id: str, container_id: str, force: bool = False
):
    try:
        await network_raise_if_not_found(
            disconnect_container, network_id, container_id, force
        )
        return JSONResponse({"message": "ok"})
    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "container not found",
                "id": container_id,
            },
        )


@network_router.delete(
    "",
    description="Delete specific network by ID",
    dependencies=[Depends(token_has_permission([Permission.DeleteNetwork]))],
    responses={200: MESSAGE_OK()},
)
async def remove_network_api(id: str):
    await network_raise_if_not_found(remove_network, id)
    return JSONResponse({"message": "ok"})


@network_router.delete(
    "/prune",
    description="Prune network",
    dependencies=[Depends(token_has_permission([Permission.PruneNetwork]))],
    responses={200: MESSAGE_OK()},
)
async def prune_network_api():
    await network_raise_if_not_found(prune_network)
    return JSONResponse({"message": "ok"})


router.include_router(container_router)
router.include_router(image_router)
router.include_router(volume_router)
router.include_router(network_router)
