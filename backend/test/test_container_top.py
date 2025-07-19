from typing import Any, Dict, List, Literal, cast

import docker

client = docker.from_env()
container = client.containers.get("agent-db")


raw_top = cast(
    Dict[Literal["Processes"] | Literal["Titles"], List[Any]], container.top()
)
output: List[Dict[str, str]] = []
for processInfos in raw_top["Processes"]:
    obj: Dict[str, str] = {}
    for index, info in enumerate(processInfos):
        obj[raw_top["Titles"][index]] = info
    output.append(obj)

print(output.__str__())