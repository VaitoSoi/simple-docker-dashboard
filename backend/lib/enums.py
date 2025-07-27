from enum import Enum


class Permission(Enum):
    Administrator = 0

    Containers = 10
    SeeContainers = 11
    RenameContainer = 12
    StartContainer = 13
    RestartContainer = 14
    KillContainer = 15
    StopContainer = 16
    RemoveContainer = 17
    SeeLogs = 18
    Resource = 19

    Images = 20
    SeeImages = 21
    DeleteImage = 22

    Roles = 30
    SeeRoles = 31
    CreateRole = 32
    GrantRoles = 33
    UpdateRole = 34
    DeleteRole = 35
    SeePermissions = 36

    Users = 40
    SeeUsers = 41
    UpdateUsers = 42
    DeleteUsers = 43


default_permission = [
    Permission.SeeContainers,
    Permission.SeeLogs,
    Permission.SeeImages,
    Permission.Resource
]