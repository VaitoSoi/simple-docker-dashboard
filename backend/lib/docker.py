import os
import shutil
import tarfile
from asyncio import Task, create_task, gather, to_thread
from queue import Empty, Queue
from socket import socket as _socket
from threading import Event, Thread
from typing import Any, Dict, Generator, List, Literal, Tuple, cast
from uuid import uuid4

import docker
import psutil
from docker.constants import STREAM_HEADER_SIZE_BYTES
from docker.errors import ImageNotFound, NotFound
from docker.models.containers import Container
from docker.models.images import Image
from docker.models.volumes import Volume
from pydantic import BaseModel

from lib.errors import (
    CommandNotFound,
    ContainerNotFound,
    ImageNotFound as _ImageNotFound,
    InvalidPath,
    TerminalNotFound,
    VolumeNotFound,
)
from lib.utils import expect_type

client = docker.from_env()


class DirEntry(BaseModel):
    name: str
    type: (
        Literal["directory"]
        | Literal["file"]
        | Literal["executable"]
        | Literal["sock"]
        | Literal["symlink"]
        | Literal["other"]
    )


"""
CONTAINER
"""


class FormattedContainer(BaseModel):
    id: str
    short_id: str
    name: str | None
    image: str
    created: str
    status: str
    ports: List[str]


class ContainerPruneResponse(BaseModel):
    ContainersDeleted: list[str] | None
    SpaceReclaimed: int


def _format_container(container: Container) -> FormattedContainer:
    return FormattedContainer(
        id=container.id or container.short_id,
        short_id=container.short_id,
        name=container.name,
        image=container.image.tags[0]
        if container.image and len(container.image.tags)
        else "None",
        created=container.attrs["Created"],
        status=container.status,
        ports=_format_port_mapping(container.attrs["NetworkSettings"]["Ports"]),
    )


def _format_port_mapping(
    port_mapping: Dict[
        str, List[Dict[Literal["HostIp"] | Literal["HostPort"], str]] | None
    ],
) -> List[str]:
    maps: List[str] = []

    for private_port, configs in port_mapping.items():
        if configs is None:
            continue

        for config in configs:
            ip = config["HostIp"] if config["HostIp"] != "::" else "[::]"
            port = config["HostPort"]
            maps.append(f"{ip}:{port}->{private_port}")

    return maps


async def get_containers_raw(all: bool = True):
    return sorted(
        cast(
            List[Container],
            await to_thread(client.containers.list, all),  # type: ignore
        ),
        key=lambda container: container.id or container.short_id,
    )


async def get_containers(all: bool = True):
    return [_format_container(container) for container in await get_containers_raw(all)]


async def _get_container(id: str):
    try:
        return await to_thread(client.containers.get, id)  # type: ignore

    except NotFound:
        raise ContainerNotFound()


async def get_container(id: str):
    return _format_container(await _get_container(id))


async def get_container_raw(id: str):
    return (await _get_container(id)).attrs


async def rename_container(id: str, new_name: str):
    container = await _get_container(id)
    await to_thread(container.rename, new_name)  # type: ignore


async def start_container(id: str):
    container = await _get_container(id)
    await to_thread(container.start)


async def restart_container(id: str):
    container = await _get_container(id)
    await to_thread(container.restart)  # type: ignore


async def kill_container(id: str):
    container = await _get_container(id)
    await to_thread(container.kill)  # type: ignore


async def stop_container(id: str):
    container = await _get_container(id)
    await to_thread(container.stop)


async def remove_container(id: str):
    container = await _get_container(id)
    await to_thread(container.remove)


async def inspect_container(id: str) -> dict[str, Any]:
    container = await _get_container(id)
    return container.attrs


async def top_container(id: str) -> List[Dict[str, str]] | None:
    container = await _get_container(id)

    if container.status != "running":
        return

    raw_top = cast(
        Dict[Literal["Processes"] | Literal["Titles"], List[Any]], container.top()
    )
    output: List[Dict[str, str]] = []
    for processInfos in raw_top["Processes"]:
        obj: Dict[str, str] = {}
        for index, info in enumerate(processInfos):
            obj[raw_top["Titles"][index]] = info
        output.append(obj)

    return output


async def prune_container() -> ContainerPruneResponse:
    return ContainerPruneResponse(**(await to_thread(client.containers.prune)))  # type: ignore


def _stream_logs(log_queue: Queue[str], log_stream: Generator[bytes]):
    try:
        for log_line in log_stream:
            log_queue.put(log_line.decode("utf-8"))

    except Exception as e:
        log_queue.put(f"Error streaming logs: {str(e)}")

    finally:
        log_queue.put("SimpleDockerDashboard_EOL")


async def docker_logs_stream(
    id: str, tail: int | None
) -> Tuple[Queue[str], Generator[bytes]]:
    try:
        log_queue: Queue[str] = Queue()

        container = await _get_container(id)
        log_stream = cast(
            Generator[bytes],
            container.logs(
                stream=True, follow=True, stdout=True, stderr=True, tail=tail or "all"
            ),
        )

        thread = Thread(
            target=lambda: _stream_logs(log_queue=log_queue, log_stream=log_stream),
            daemon=True,
        )
        thread.start()

        return (log_queue, log_stream)

    except NotFound:
        raise ContainerNotFound()


class ExecResponse(BaseModel):
    command: str
    output: str
    pwd: str


async def get_docker_exec(
    id: str,
    input: Queue[bytes],
) -> tuple[Queue[ExecResponse], Event, Task[None]]:
    try:
        container = await _get_container(id)

        exit_code, _ = cast(
            tuple[int, bytes],
            container.exec_run(cmd='/bin/sh -c "echo Hello"'),  # type: ignore
        )
        if exit_code != 0:
            raise TerminalNotFound()

        _, raw_socket = container.exec_run(cmd="/bin/sh", stdin=True, socket=True)  # type: ignore
        socket = expect_type(raw_socket._sock, _socket)  # type: ignore

        event = Event()
        output = Queue[ExecResponse]()

        return (
            output,
            event,
            create_task(to_thread(_exec_command, socket, event, input, output)),
        )

    except NotFound:
        raise ContainerNotFound()


def _exec_command(
    sock: _socket, event: Event, input: Queue[bytes], output: Queue[ExecResponse]
):
    while not event.is_set():
        try:
            command = input.get(timeout=5)
        except Empty:
            continue

        data = [
            frag.decode()
            for frag in _send_command(sock, command).split(
                b"\x01\x00\x00\x00\x00\x00\x00\x02"
            )
        ]
        data = (
            data
            if len(data) >= 2
            else [data[0], ""]
            if " " in data[0]
            else ["", data[0]]
        )
        res, pwd = [frag.rstrip("\n") for frag in data]

        print(res, pwd)

        output.put(ExecResponse(command=command.decode(), output=res, pwd=pwd))


def _send_command(sock: _socket, command: bytes) -> bytes:
    sock.sendall(command)

    sock.recv(STREAM_HEADER_SIZE_BYTES)

    buffer_size = 4096  # 4 KB
    data = b""
    while True:
        part = sock.recv(buffer_size)
        data += part
        if len(part) < buffer_size:
            # either 0 or end of data
            break
    return data


async def container_ls(id: str, path: str = "/") -> list[DirEntry]:
    container = await _get_container(id)
    exit_code, ls = cast(
        tuple[int, bytes],
        await to_thread(
            container.exec_run,  # type: ignore
            cmd=f"ls -F -1 {path}",
            stdout=True,
        ),
    )
    if exit_code != 0:
        raise CommandNotFound()
    entries = ls.decode().splitlines()
    formatted_entries: list[DirEntry] = []
    for entry in entries:
        entry_type = (
            "directory"
            if entry.endswith("/")
            else "executable"
            if entry.endswith("*")
            else "symlink"
            if entry.endswith("@")
            else "sock"
            if entry.endswith("=")
            else "other"
            if entry.endswith("%") or entry.endswith("|")
            else "file"
        )
        formatted_entries.append(
            DirEntry(
                name=(entry if entry_type == "file" else entry[:-1]), type=entry_type
            )
        )
    return formatted_entries


async def container_cat(id: str, path: str) -> str:
    container = await _get_container(id)
    exit_code, cat = cast(
        tuple[int, bytes],
        await to_thread(
            container.exec_run,  # type: ignore
            cmd=f"cat {path}",
            stdout=True,
        ),
    )
    if exit_code != 0:
        raise CommandNotFound()
    content = cat.decode()
    return content


async def container_download(id: str, path: str) -> bytes:
    container = await _get_container(id)
    if not path:
        raise InvalidPath
    dir_frag = [frag for frag in path.split("/") if frag.strip() != ""]
    dir = "/".join(dir_frag[:-1])
    target = dir_frag[-1]
    entry = [entry for entry in await container_ls(id, dir) if entry.name == target][0]

    stream, _ = cast(
        tuple[Generator[bytes], dict[str, Any]],
        client.api.get_archive(container.id or container.short_id, path),  # type: ignore
    )
    data = b""
    for piece in stream:
        data += piece

    base_path = os.path.join(".", "temp")
    archive_id = uuid4().__str__()

    tar_path = os.path.join(base_path, f"{archive_id}.tar.gz")
    with open(tar_path, "wb+") as file:
        file.write(data)

    extract_dir = os.path.join(base_path, archive_id)
    with tarfile.open(tar_path) as tar_file:
        tar_file.extractall(extract_dir)

    response = b""
    if entry.type == "directory":
        zip_path = os.path.join(base_path, f"{archive_id}")
        shutil.make_archive(zip_path, "zip", extract_dir)
        
        zip_path += ".zip"
        with open(zip_path, "rb") as file:
            response = file.read()

        os.remove(zip_path)
    
    else:
        target_path = os.path.join(base_path, archive_id, target)
        with open(target_path, "rb") as file:
            response = file.read()

    os.remove(tar_path)
    shutil.rmtree(extract_dir)
    return response



"""
IMAGE
"""


class FormattedImage(BaseModel):
    id: str
    short_id: str
    tags: List[str]
    # hub_url: str


class ImagePruneResponse(BaseModel):
    ImagesDeleted: list[dict[str, str]] | None
    SpaceReclaimed: int


async def _format_image(image: Image) -> FormattedImage:
    # arr = []
    # if len(image.tags):
    #     arr = image.tags[0].split("/")
    # else:
    #     arr = image.attrs["RepoDigests"][0].split("@")[0].split("/")
    # x, y, z = arr + [None] * (3 - len(arr))
    # url = ""

    # if x and y and z:
    #     z = z.split(":")[0]
    #     if x == "quay.io":
    #         url = f"https://quay.io/repository/{y}/{z}"
    #     else:
    #         url = f"{x}/{y}/{z}"
    # elif x and y:
    #     y = y.split(":")[0]
    #     url = f"https://hub.docker.com/r/{x}/{y}"
    # elif x:
    #     x = x.split(":")[0]
    #     url = f"https://hub.docker.com/_/{x}"

    # async with aiohttp.ClientSession() as session:
    #     async with session.get(url) as response:
    #         if response.status != 200:
    #             url = ""

    return FormattedImage(
        id=image.id or image.short_id,
        short_id=image.short_id,
        tags=image.tags,
        # hub_url=url,
    )


async def get_images():
    return sorted(
        [await _format_image(image) for image in await to_thread(client.images.list)],
        key=lambda image: image.id,
    )


async def get_image(id: str):
    try:
        return await _format_image(await to_thread(client.images.get, id))

    except ImageNotFound:
        raise _ImageNotFound()


async def remove_image(id: str):
    try:
        await to_thread(client.images.remove, id)  # type: ignore
    except ImageNotFound:
        raise _ImageNotFound()


async def prune_images(dangling: bool = True) -> ImagePruneResponse:
    return ImagePruneResponse(
        **(await to_thread(client.images.prune, {"dangling": dangling}))  # type: ignore
    )


"""
RESOURCE USAGE
"""


class ResourceMetrics(BaseModel):
    docker: float
    system: float
    total: float


class ResourceUsages(BaseModel):
    memory: ResourceMetrics
    cpu: ResourceMetrics


class ResourceUsage(BaseModel):
    cpu: float
    memory: float


async def _measure_container_resources(container: Container) -> Tuple[float, float]:
    """
    Measure resource usage for a single container.

    Returns:
        Tuple of (memory_usage_gb, cpu_usage_percent)
    """
    try:
        stats = cast(Dict[str, Any], await to_thread(container.stats, stream=False))  # type: ignore

        memory_usage_gb = 0.0
        cpu_usage_percent = 0.0

        if (
            "memory_stats" in stats
            and isinstance(stats["memory_stats"], dict)
            and "usage" in stats["memory_stats"]
        ):
            memory_usage_gb = float(stats["memory_stats"]["usage"]) / (1024**3)  # type: ignore

        if (
            "cpu_stats" in stats
            and "precpu_stats" in stats
            and isinstance(stats["cpu_stats"], dict)
            and isinstance(stats["precpu_stats"], dict)
        ):
            cpu_stats = stats["cpu_stats"]  # type: ignore
            precpu_stats = stats["precpu_stats"]  # type: ignore

            if (
                isinstance(cpu_stats.get("cpu_usage"), dict)  # type: ignore
                and isinstance(precpu_stats.get("cpu_usage"), dict)  # type: ignore
                and "total_usage" in cpu_stats["cpu_usage"]
                and "total_usage" in precpu_stats["cpu_usage"]
                and "system_cpu_usage" in cpu_stats
                and "system_cpu_usage" in precpu_stats
            ):
                cpu_delta = float(cpu_stats["cpu_usage"]["total_usage"]) - float(  # type: ignore
                    precpu_stats["cpu_usage"]["total_usage"]  # type: ignore
                )
                system_delta = float(cpu_stats["system_cpu_usage"]) - float(  # type: ignore
                    precpu_stats["system_cpu_usage"]  # type: ignore
                )
                online_cpus = float(
                    cpu_stats.get("online_cpus", psutil.cpu_count() or 1)  # type: ignore
                )

                if system_delta > 0 and cpu_delta >= 0:
                    cpu_usage_percent = (cpu_delta / system_delta) * online_cpus * 100.0

        return memory_usage_gb, cpu_usage_percent

    except Exception:
        # Return 0 values if container stats can't be retrieved
        return 0.0, 0.0


async def get_resource_usages() -> ResourceUsages:
    """
    Calculate Docker and System resource usage.

    Returns:
        ResourceUsage model containing memory and cpu usage information:
        {
            "memory": {
                "docker": float,  # Docker containers memory usage in GB
                "system": float,  # Total system memory usage in GB
                "total": float    # Total system memory in GB
            },
            "cpu": {
                "docker": float,  # Docker containers CPU usage percentage
                "system": float,  # System CPU usage percentage
                "total": float    # Total CPU count
            }
        }
    """
    memory = psutil.virtual_memory()
    total_memory_gb = memory.total / (1024**3)
    system_memory_used_gb = memory.used / (1024**3)

    # Get system CPU info
    cpu_count = psutil.cpu_count() or 1
    system_cpu_percent = psutil.cpu_percent(interval=1)

    try:
        containers = cast(List[Container], await to_thread(client.containers.list))  # type: ignore

        measurement_tasks = [
            _measure_container_resources(container) for container in containers
        ]

        measurement_results = await gather(*measurement_tasks, return_exceptions=True)

        docker_memory_usage = 0.0
        docker_cpu_usage = 0.0

        for result in measurement_results:
            if isinstance(result, tuple) and len(result) == 2:
                memory_gb, cpu_percent = result
                docker_memory_usage += memory_gb
                docker_cpu_usage += cpu_percent

    except Exception:
        docker_memory_usage = 0.0
        docker_cpu_usage = 0.0

    return ResourceUsages(
        memory=ResourceMetrics(
            docker=round(docker_memory_usage, 2),
            system=round(system_memory_used_gb, 2),
            total=round(total_memory_gb, 2),
        ),
        cpu=ResourceMetrics(
            docker=round(docker_cpu_usage, 2),
            system=round(system_cpu_percent, 2),
            total=float(cpu_count),
        ),
    )


async def get_resource_usage(id: str):
    container = await _get_container(id)
    memory, cpu = await _measure_container_resources(container)
    return ResourceUsage(cpu=cpu, memory=memory)


"""
VOLUMES
"""


class FormattedVolume(BaseModel):
    id: str
    short_id: str
    name: str


class VolumePruneResponse(BaseModel):
    VolumesDeleted: list[Any]
    SpaceReclaimed: int


def format_volume(volume: Volume) -> FormattedVolume:
    return FormattedVolume(
        id=volume.id or volume.short_id, short_id=volume.short_id, name=volume.name
    )


async def get_volumes() -> list[FormattedVolume]:
    return sorted(
        [format_volume(volume) for volume in await to_thread(client.volumes.list)],  # type: ignore
        key=lambda volume: volume.name,
    )


async def get_volume(id: str) -> FormattedVolume:
    try:
        return format_volume(await to_thread(client.volumes.get, id))

    except NotFound:
        raise VolumeNotFound()


async def _get_volume(id: str) -> Volume:
    try:
        return await to_thread(client.volumes.get, id)

    except NotFound:
        raise VolumeNotFound()


async def volume_ls(id: str, path: str = "") -> list[DirEntry]:
    await get_volume(id)
    container = await to_thread(
        client.containers.run,
        image="busybox",
        command=f"ls -F -1 {path}",
        stdout=True,
        detach=True,
        volumes=[f"{id}:/inspect:ro"],
        working_dir="/inspect",
    )
    await to_thread(container.wait)
    if container.attrs["State"]["ExitCode"] != 0:
        raise InvalidPath()
    ls = container.logs().decode()
    await to_thread(container.remove, force=True)
    entries = ls.splitlines()
    formatted_entries: list[DirEntry] = []
    for entry in entries:
        entry_type = (
            "directory"
            if entry.endswith("/")
            else "executable"
            if entry.endswith("*")
            else "symlink"
            if entry.endswith("@")
            else "sock"
            if entry.endswith("=")
            else "other"
            if entry.endswith("%") or entry.endswith("|")
            else "file"
        )
        formatted_entries.append(
            DirEntry(
                name=(entry if entry_type == "file" else entry[:-1]), type=entry_type
            )
        )
    return formatted_entries


async def volume_cat(id: str, path: str) -> str:
    await get_volume(id)
    container = await to_thread(
        client.containers.run,
        image="busybox",
        command=f"cat {path}",
        stdout=True,
        detach=True,
        volumes=[f"{id}:/inspect:ro"],
        working_dir="/inspect",
    )
    await to_thread(container.wait)
    if container.attrs["State"]["ExitCode"] != 0:
        await to_thread(container.remove)
        raise InvalidPath()
    content = container.logs().decode()
    await to_thread(container.remove, force=True)
    return content


async def volume_download(id: str, path: str):
    if not path:
        raise InvalidPath()
    dir_frag = [frag for frag in path.split("/") if frag.strip() != ""]
    dir = "/".join(dir_frag[:-1])
    target = dir_frag[-1]
    entry = [entry for entry in await volume_ls(id, dir) if entry.name == target][0]

    entry_id = uuid4()
    if entry.type == "directory":
        await to_thread(
            client.containers.run,
            image="javieraviles/zip",
            command=f"zip -r /output/{entry_id}.zip {path}",
            volumes=[
                f"{id}:/inspect:ro",
                f"{os.path.join(os.getcwd(), 'temp')}:/output",
            ],
            working_dir="/inspect",
            remove=True,
        )
    else:
        await to_thread(
            client.containers.run,
            image="busybox",
            command=f"cp {path} /output/{entry_id}",
            volumes=[
                f"{id}:/inspect:ro",
                f"{os.path.join(os.getcwd(), 'temp')}:/output",
            ],
            working_dir="/inspect",
            remove=True,
        )
    uid = os.getuid()
    ext = ".zip" if entry.type == "directory" else ""
    await to_thread(
        client.containers.run,
        image="busybox",
        command=f"chown {uid}:{uid} /output/{entry_id}{ext}",
        volumes=[f"{os.path.join(os.getcwd(), 'temp')}:/output"],
        working_dir="/output",
        remove=True,
    )
    entry_path = os.path.join(".", "temp", f"{entry_id}{ext}")
    output = open(entry_path, "rb").read()
    os.remove(entry_path)
    return output


async def remove_volume(id: str):
    volume = await _get_volume(id)
    await to_thread(volume.remove)


async def prune_volumes():
    return VolumePruneResponse(**(await to_thread(client.volumes.prune)))
