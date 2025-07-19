# Simple Docker Dashboard API

## API Endpoints

### Docker Router (`/docker`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/docker/containers` | `Permission.SeeContainers` | Get list of containers (show_all parameter) |
| GET | `/docker/container` | `Permission.SeeContainers` | Get specific container by id or name |
| POST | `/docker/start` | `Permission.StartContainer` | Start a container by id |
| POST | `/docker/stop` | `Permission.StopContainer` | Stop a container by id |
| GET | `/docker/images` | `Permission.SeeImages` | Get list of images |
| GET | `/docker/image` | `Permission.SeeImages` | Get specific image by id |

### User Router (`/user`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/user/me` | *Authenticated User* | Get current user information |
| POST | `/user/login` | *Public* | User login (OAuth2 password flow) |
| GET | `/user/gets` | `Permission.SeeUser` | Get list of all users |
| GET | `/user/get` | `Permission.SeeUser` | Get specific user by id or username |
| POST | `/user/create` | *Public* | Create new user |
| PUT | `/user/update` | *Own account or `Permission.UpdateUser`* | Update user information |
| DELETE | `/user/delete` | *Own account or `Permission.DeleteUser`* | Delete user |

### Role Router (`/role`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/role/gets` | `Permission.SeeRole` | Get list of all roles |
| GET | `/role/get` | `Permission.SeeRole` | Get specific role |
| POST | `/role/create` | `Permission.CreateRole` | Create new role |
| POST | `/role/grant` | `Permission.GrantRoles` | Grant roles to user |
| PUT | `/role/update` | `Permission.UpdateRole` | Update role |
| DELETE | `/role/delete` | `Permission.DeleteRole` | Delete role |

## Permission Hierarchy

```python
class Permission(Enum):
    Administator = 0

    Containers = 10
    SeeContainers = 11
    StopContainer = 12
    StartContainer = 13
    SeeLogs = 24
    Resource = 25

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
```

## Default Permissions

New users are granted these permissions by default:
- `Permission.SeeContainers`
- `Permission.SeeLogs`
- `Permission.SeeImages`

