import asyncio
from asyncio import to_thread
from queue import Queue
from threading import Thread
from typing import Any, Dict, Generator, List, Literal, Tuple, cast

# import aiohttp
import docker
import psutil
from docker.errors import ImageNotFound, NotFound
from docker.models.containers import Container
from docker.models.images import Image
from pydantic import BaseModel

from lib.errors import ContainerNotFound, ImageNotFound as _ImageNotFound

client = docker.from_env()


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


def _format_container(container: Container) -> FormattedContainer:
    return FormattedContainer(
        id=container.id or container.short_id,
        short_id=container.short_id,
        name=container.name,
        image=container.image.tags[0] if container.image and len(container.image.tags) else "None",
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


async def get_containers(all: bool = True):
    return [
        _format_container(container)
        for container in cast(
            List[Container],
            await to_thread(client.containers.list, all),  # type: ignore
        )
    ]


async def _get_container(id: str):
    try:
        return await to_thread(client.containers.get, id)  # type: ignore

    except NotFound:
        raise ContainerNotFound()


async def get_container(id: str):
    return _format_container(await _get_container(id))


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


async def inspect_container(id: str):
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


async def docker_logs_stream(
    id: str, tail: int | None
) -> Tuple[Queue[str], Generator[bytes]]:
    try:
        log_queue: Queue[str] = Queue()

        container = await _get_container(id)
        log_stream = container.logs(
            stream=True, follow=True, stdout=True, stderr=True, tail=tail or "all"
        )

        log_stream = cast(Generator[bytes], log_stream)

        thread = Thread(
            target=lambda: _stream_logs(log_queue=log_queue, log_stream=log_stream),
            daemon=True,
        )
        thread.start()

        return (log_queue, log_stream)

    except NotFound:
        raise ContainerNotFound()


def _stream_logs(log_queue: Queue[str], log_stream: Generator[bytes]):
    """Thread function to stream logs and put them in queue"""
    try:
        for log_line in log_stream:
            log_queue.put(log_line.decode("utf-8"))

    except Exception as e:
        log_queue.put(f"Error streaming logs: {str(e)}")

    finally:
        log_queue.put("SimpleDockerDashboard_EOL")


"""
IMAGE
"""


class FormattedImage(BaseModel):
    id: str
    short_id: str
    tags: List[str]
    # hub_url: str


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
    return [await _format_image(image) for image in await to_thread(client.images.list)]


async def get_image(id: str):
    try:
        return await _format_image(await to_thread(client.images.get, id))

    except ImageNotFound:
        raise _ImageNotFound()


async def delete_image(id: str):
    try:
        await to_thread(client.images.remove, id)  # type: ignore
    except ImageNotFound:
        raise _ImageNotFound()


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

        measurement_results = await asyncio.gather(
            *measurement_tasks, return_exceptions=True
        )

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
