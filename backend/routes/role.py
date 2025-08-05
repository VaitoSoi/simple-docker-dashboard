from typing import Annotated, List, Union

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, Response

from lib.db import (
    APIRole,
    DBRole,
    DBUser,
    User,
    delete_role,
    get_roles,
    new_role,
    update_role,
    update_roles,
)
from lib.dependency import get_role_deps, get_roles_deps, get_user_deps
from lib.enums import Permission
from lib.errors import (
    InvalidRoleHex,
    InvalidRoleName,
    NotAllowed,
    RoleExisted,
)
from lib.response import HTTP_EXECEPTION_MESSAGE, MESSAGE_OK, MESSAGE_UPDATE
from lib.security import token_has_permission

ROLE_NOT_FOUND = {
    404: HTTP_EXECEPTION_MESSAGE(
        "role not found", ({"id": {"type": "string"}}, {"id": "string"})
    )
}

router = APIRouter(prefix="/role", tags=["role"])


@router.get(
    path="/",
    description="Get all role or a specific role by ID",
    dependencies=[Depends(token_has_permission([Permission.SeeRoles]))],
    responses={200: {"model": Union[list[DBRole], DBRole]}, **ROLE_NOT_FOUND},
)
def get_role(id: str | None = None, all: bool | None = None):
    if all:
        return get_roles()

    else:
        return get_role_deps(True)(id)


@router.get(
    path="/permissions",
    description="Get all permissions",
    dependencies=[Depends(token_has_permission([Permission.SeePermissions]))],
    responses={200: {"model": dict[str, int]}},
)
def get_permission():
    return {permission.name: permission.value for permission in Permission}


@router.post(
    path="/",
    description="Create new role",
    dependencies=[Depends(token_has_permission([Permission.CreateRole]))],
    status_code=201,
    responses={201: MESSAGE_OK(), 409: HTTP_EXECEPTION_MESSAGE("role already existed")},
)
def create_role(role: APIRole):
    try:
        new_role(role)

        return JSONResponse({"message": "ok"}, status_code=status.HTTP_201_CREATED)

    except RoleExisted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "role already existed"},
        )


@router.put(
    path="/grant",
    description="Grant a role to user",
    dependencies=[Depends(token_has_permission([Permission.GrantRoles]))],
    responses={
        200: MESSAGE_UPDATE("user", DBUser),  # type: ignore
        403: HTTP_EXECEPTION_MESSAGE("you can't edit admin user"),
        **ROLE_NOT_FOUND,
    },
)
def grant_role(
    target: Annotated[User, Depends(get_user_deps(True))],
    roles: Annotated[List[DBRole], Depends(get_roles_deps)],
):
    if target.id == "@admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "you can't edit admin user"},
        )

    new_user = update_roles(target, roles)

    return JSONResponse({"message": "updated", "user": new_user.model_dump()})


@router.put(
    path="/",
    description="Update role",
    dependencies=[Depends(token_has_permission([Permission.UpdateRole]))],
    responses={
        200: MESSAGE_UPDATE("role", DBRole),  # type: ignore
        400: HTTP_EXECEPTION_MESSAGE(["invalid role name", "invalid role hex"]),
        **ROLE_NOT_FOUND,
    },
)
def update_role_api(
    new_role: APIRole, role: Annotated[DBRole, Depends(get_role_deps(True))]
):
    try:
        updated_role = update_role(new_role, id=role.id)

        return JSONResponse({"message": "updated", "role": updated_role.model_dump()})

    except InvalidRoleName:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid role name"},
        )

    except InvalidRoleHex:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid role hex"},
        )


@router.delete(
    path="/",
    description="Delete role",
    dependencies=[Depends(token_has_permission([Permission.DeleteRole]))],
    responses={204: {}, 403: HTTP_EXECEPTION_MESSAGE(), **ROLE_NOT_FOUND},
)
def delete_role_api(role: Annotated[DBRole, Depends(get_role_deps(True))]):
    try:
        delete_role(id=role.id)

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except NotAllowed as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e)}
        )
