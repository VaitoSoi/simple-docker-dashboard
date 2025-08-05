# Simple Docker Dashboard Backend

## I. Introduction

This is a simple FastAPI app, use JWT for token creation, SQLModel for interacting with database and SQLite (default) as database.

## II. Endpoints

### 1. Docker

#### a. Containers

|Method|Path|Require permission|Description|
|------|----|------------------|-----------|
|`GET`|`/docker/containers`|`SeeContainers`|Get all containers|
|`GET`|`/docker/container`|`SeeContainers`|Get specific container by ID, Short ID or Name|
|`GET`|`/docker/inspect`|`SeeContainers`|Get specific container attributes by ID, Short ID or Name|
|`GET`|`/docker/top`|`SeeContainers`|Get specific container running process by ID, Short ID or Name|
|`POST`|`/docker/start`|`StartContainers`|Start specific container by ID, Short ID or Name|
|`POST`|`/docker/stop`|`StopContainers`|Stop specific container by ID, Short ID or Name|
|`POST`|`/docker/rename`|`RenameContainers`|Rename specific container by ID, Short ID or Name|
|`POST`|`/docker/restart`|`RestartContainers`|Restart specific container by ID, Short ID or Name|
|`POST`|`/docker/kill`|`KillContainers`|Kill specific container by ID, Short ID or Name|
|`DELETE`|`/docker/container`|`SeeContainers`|Remove specific container by ID, Short ID or Name|
|Websocket|`/docker/logs`|`SeeLogs`|Get specific container logs stream by ID, Short ID or Name|

#### b. Images

|Method|Path|Require permission|Description|
|------|----|------------------|-----------|
|`GET`|`/docker/images`|`SeeImages`|Get all images|
|`GET`|`/docker/image`|`SeeImages`|Get specific image by ID or Short ID|
|`DELETE`|`/docker/image`|`DeleteImages`|Remove specific image by ID or Short ID|

##### c. Mics

|Method|Path|Require permission|Description|
|------|----|------------------|-----------|
|`GET`|`/docker/resource`|`Resource`|Get resource usage by Docker and system|

### 2. Users

|Method|Path|Require permission|Description|
|------|----|------------------|-----------|
|`GET`|`/user/me`|/|Get current user|
|`POST`|`/user/login`|/|Login and get token|
|`GET`|`/user/`|`SeeUsers`|Get specific user by ID or Username or get all users|
|`GET`|`/user/has_permission`|/|Check if current has require permssion|
|`POST`|`/user/`|/|Create new user|
|`PUT`|`/user/`|/|Update current user or a specific user by ID|
|`DELETE`|`/user/`|/|Delete current user or a specific user by ID|

### 3. Roles

|Method|Path|Require permission|Description|
|------|----|------------------|-----------|
|`GET`|`/role/`|`SeeRoles`|Get all role or a specific role by ID|
|`GET`|`/role/permissions`|`SeePermission`|Get all permissions|
|`POST`|`/role/`|`CreateROle`|Create new role|
|`PUT`|`/role/grant`|`GrantRoles`|Grant a role to user|
|`PUT`|`/role/`|`UpdateRole`|Update role|
|`DELETE`|`/role`|`DeleteRole`|Delete role|

## III. Permissions

### 1. List of permissions

|Name|Value|
|-|-|
Administrator | 0
**Containers group**|-
Containers | 10
SeeContainers | 11
RenameContainer | 12
StartContainer | 13
RestartContainer | 14
KillContainer | 15
StopContainer | 16
RemoveContainer | 17
SeeLogs | 18
Resource | 19
**Image group**|-
Images | 20
SeeImages | 21
DeleteImage | 22
**Role group**|-
Roles | 30
SeeRoles | 31
CreateRole | 32
GrantRoles | 33
UpdateRole | 34
DeleteRole | 35
SeePermissions | 36
**User group**|-
Users | 40
SeeUsers | 41
UpdateUsers | 42
DeleteUsers | 43

### 2. How permission system work ?

If users have a top permission, they will have all permission in that group.

Example: If user have permission `Containers`, they will have all permission in `Container group`

## IV. Environments

|Name|Default value|Accept value|Note|
|----|-------------|------------|----|
|`USE_HASH`|`true`|`true` or `false`|Please keep this value unchanged if you do not want to mess up the hash function. If you want to change this value, you must delete the database.|
|`SIGNATURE`|Random string|Any string|Set this value if you do not want to create a new token each time you restart.|
|`DB_URL`|`sqlite:///database.db`|A SQL DB connection string|Any kind of SQL DB that SQLAlchemy supports|
|`PORT`|`8000`|A number from 0-65535|Only used when you run this app with uvicorn|
|`HOST`|`127.0.0.1`|An IP|Only used when you run this app with uvicorn|

## V. How to run

### 1. With FastAPI CLI

To start a development server:

```bash
fastapi dev main.py
```

To run for production:

```bash
fastapi run main.py
```

### 2. With uvicorn

To start a development server:

```bash
uvicorn main:app --reload
```

To run for production:

```bash
uvicorn main:app
```
