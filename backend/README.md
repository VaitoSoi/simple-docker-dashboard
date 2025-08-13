# Simple Docker Dashboard Backend

## I. Introduction

This is a simple FastAPI app, use JWT for token creation, SQLModel for interacting with database and SQLite (default) as database.

## II. Endpoints

* I'm too lazy to list there 😭
* Please visit the endpoint `/docs` for more information ;-;

## III. Permissions

### 1. How permission system work ?

#### a. Top permission

If users have a top permission, they will have all permissions in that group.

Example: If user have permission `Containers`, they will have all permissions in `Container group`

#### b. Everyone permission

SDD has a special role call `@everyone` (yep, it borrow idea from Discord), every users will have permission that this role have.

Example: If role `@everyone` has `SeeContainers`, `SeeImages`, ever users will also have that permission too.

### 2. List of permissions

|Name|Value|Note
|-|-|-|
Administrator|0
**Container group**|-|-
Containers|1
SeeContainers|11
RenameContainer|12
StartContainer|13
RestartContainer|14
KillContainer|15
StopContainer|16
RemoveContainer|17
SeeLogs|18
Resource|19
PruneContainer|110
SeeContainerRaw|111
InspectContainer|112
ExecuteCommand|113
LsContainer|114
CatContainer|115
DownloadContainer|116|Download a file or a folder not entire container :D
**Image group**|-|-
Images|2
SeeImages|21
DeleteImage|22
PruneImage|23
**Volume group**|-|-
Volumes|3
SeeVolumes|31
LsVolume|32
CatVolume|33
DownloadVolume|34
DeleteVolume|35|Like `DownloadContainer`, this is for downloading a file or a folder not image
PruneVolume|36
**Network group**|-
Networks|4
SeeNetwork|41
ConnectContainer|42
DisconnectContainer|43
DeleteNetwork|44
PruneNetwork|45
**Role group**|-|-
Roles|8
SeeRoles|81
CreateRole|82
GrantRoles|83
UpdateRole|84
DeleteRole|85
SeePermissions|86
**User group**|-|-
Users|9
SeeUsers|91
UpdateUsers|92
DeleteUsers|93

### 3. Default everyone permission

```python
default_permission = [
    Permission.SeeContainers,
    Permission.SeeContainerRaw,
    Permission.InspectContainer,
    Permission.Resource,
    Permission.SeeLogs,
    Permission.SeeImages,
    Permission.SeeVolumes,
]
```

## IV. Environments

|Name|Default value|Accept value|Note|
|----|-------------|------------|----|
|`USE_HASH`|`true`|`true` or `false`|Please keep this value unchanged if you do not want to mess up the hash function. If you want to change this value, you must delete the database.|
|`SIGNATURE`|Random string (reset every time you restart)|Any string|Set this value if you don't want to create a new token each time you restart.|
|`DB_URL`|`sqlite:///database.db`|A SQL DB connection string|Any kind of SQL DB that SQLAlchemy supports|
|`PORT`|`8000`|A number from 0-65535|Only used when you run this app with uvicorn|
|`HOST`|`127.0.0.1`|An valid IP|Only used when you run this app with uvicorn|

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
