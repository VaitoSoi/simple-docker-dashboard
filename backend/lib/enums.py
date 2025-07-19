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
    Resource = 29

    Images = 20
    SeeImages = 21
    DeleteImage = 22

    Deploy = 30
    SeeDeploy = 31
    ConfigDeploy = 32
    
    Roles = 40
    SeeRole = 41
    CreateRole = 42
    GrantRoles = 43
    UpdateRole = 44
    DeleteRole = 45

    Users = 50
    SeeUser = 51
    UpdateUser = 52
    DeleteUser = 53


default_permission = [
    Permission.SeeContainers,
    Permission.SeeLogs,
    Permission.SeeImages,
]