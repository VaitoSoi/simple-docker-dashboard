from asyncio import to_thread
from queue import Empty
from typing import Annotated

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
    delete_image,
    docker_logs_stream,
    get_container,
    get_containers,
    get_image,
    get_images,
    get_resource_usage,
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
from lib.security import (
    check_user_has_permission,
    get_user_from_token,
    token_has_permission,
)

router = APIRouter(prefix="/docker", tags=["docker"])

"""
CONTAINER
"""


@router.get(
    "/containers",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
)
async def get_containers_api(show_all: bool = False):
    return await get_containers(show_all)


@router.get(
    "/container",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
)
async def get_container_api(id: str):
    try:
        return await get_container(id)

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


@router.get(
    "/inspect",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))],
)
async def inspect_container_api(id: str):
    try:
        return await inspect_container(id)

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )

@router.get(
    "/top",
    dependencies=[Depends(token_has_permission([Permission.SeeContainers]))]
)
async def top_container_api(id: str):
    try:
        return await top_container(id)
    
    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id}
        )

@router.post(
    "/start", dependencies=[Depends(token_has_permission([Permission.StartContainer]))]
)
async def start_container_api(id: str):
    try:
        await start_container(id)
        return JSONResponse({"message": "ok"})

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


@router.post(
    "/stop", dependencies=[Depends(token_has_permission([Permission.StopContainer]))]
)
async def stop_container_api(id: str):
    try:
        await stop_container(id)
        return JSONResponse({"message": "ok"})

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


@router.post(
    "/rename",
    dependencies=[Depends(token_has_permission([Permission.RenameContainer]))],
)
async def rename_container_api(id: str, new_name: str):
    try:
        await rename_container(id, new_name)
        return JSONResponse({"message": "Container renamed successfully"})

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


@router.post(
    "/restart",
    dependencies=[Depends(token_has_permission([Permission.RestartContainer]))],
)
async def restart_container_api(id: str):
    try:
        await restart_container(id)
        return JSONResponse({"message": "Container restarted successfully"})

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


@router.post(
    "/kill", dependencies=[Depends(token_has_permission([Permission.KillContainer]))]
)
async def kill_container_api(id: str):
    try:
        await kill_container(id)
        return JSONResponse({"message": "Container killed successfully"})

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


@router.delete(
    "/container",
    dependencies=[Depends(token_has_permission([Permission.RemoveContainer]))],
)
async def remove_container_api(id: str):
    try:
        await remove_container(id)
        return JSONResponse({"message": "Container removed successfully"})

    except ContainerNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "container not found", "id": id},
        )


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


@router.get(
    "/images", dependencies=[Depends(token_has_permission([Permission.SeeImages]))]
)
async def get_images_api():
    return await get_images()


@router.get(
    "/image", dependencies=[Depends(token_has_permission([Permission.SeeImages]))]
)
async def get_image_api(id: str):
    try:
        return await get_image(id)

    except ImageNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "image not found", "id": id},
        )


@router.delete(
    "/image", dependencies=[Depends(token_has_permission([Permission.DeleteImage]))]
)
async def delete_image_api(id: str):
    try:
        await delete_image(id)
        return JSONResponse({"message": "Image deleted successfully"})

    except ImageNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "image not found", "id": id},
        )


@router.get(
    "/resource", dependencies=[Depends(token_has_permission([Permission.Resource]))]
)
async def get_resource(id: str | None = None):
    if not id:
        return await get_resource_usage()
