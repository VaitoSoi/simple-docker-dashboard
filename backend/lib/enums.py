from enum import Enum


class Permission(Enum):
    Administrator = 0
    
    Containers = 1
    SeeContainers = 11
    RenameContainer = 12
    StartContainer = 13
    RestartContainer = 14
    KillContainer = 15
    StopContainer = 16
    RemoveContainer = 17
    SeeLogs = 18
    Resource = 19
    PruneContainer = 110
    SeeContainerRaw = 111
    ExecuteCommand = 112

    Images = 2
    SeeImages = 21
    DeleteImage = 22
    PruneImage = 23

    Volumes = 3
    SeeVolumes = 31
    LsVolume = 32
    CatVolume = 33
    DeleteVolume = 34
    PruneVolume = 35

    Networks = 4
    
    Roles = 8
    SeeRoles = 81
    CreateRole = 82
    GrantRoles = 83
    UpdateRole = 84
    DeleteRole = 85
    SeePermissions = 86

    Users = 9
    SeeUsers = 91
    UpdateUsers = 92
    DeleteUsers = 93


default_permission = [
    Permission.SeeContainers,
    Permission.SeeLogs,
    Permission.SeeImages,
    Permission.Resource,
]
