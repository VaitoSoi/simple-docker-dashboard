from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, Response

from lib.db import (
    APIRole,
    DBRole,
    User,
    delete_role,
    get_roles,
    new_role,
    update_role,
    update_roles,
)
from lib.dependency import get_role_deps, get_roles_deps, get_user_deps
from lib.enums import Permission
from lib.errors import InvalidRoleName, NotAllowed, RoleExisted, RoleNotFound
from lib.security import token_has_permission

router = APIRouter(
    prefix="/role",
    tags=["role"]
)


@router.get(
    path="/gets", dependencies=[Depends(token_has_permission([Permission.SeeRole]))]
)
def get_roles_api():
    return get_roles()


@router.get(
    path="/get", dependencies=[Depends(token_has_permission([Permission.SeeRole]))]
)
def get_role(role: Annotated[DBRole, Depends(get_role_deps(True))]):
    return role


@router.post(
    path="/create",
    dependencies=[Depends(token_has_permission([Permission.CreateRole]))],
)
def create_role(role: APIRole):
    try:
        new_role(role)

        return "ok"

    except RoleExisted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "role already existed"},
        )


@router.post(
    path="/grant", dependencies=[Depends(token_has_permission([Permission.GrantRoles]))]
)
def grant_role(
    target: Annotated[User, Depends(get_user_deps(True))],
    roles: Annotated[List[DBRole], Depends(get_roles_deps)],
):
    new_user = update_roles(target, roles)

    return JSONResponse({"message": "updated", "user": new_user.model_dump()})


@router.put(
    path="/update",
    dependencies=[Depends(token_has_permission([Permission.UpdateRole]))],
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

    except NotAllowed as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e)}
        )


@router.delete(
    path="/delete",
    dependencies=[Depends(token_has_permission([Permission.DeleteRole]))],
)
def delete_role_api(role: Annotated[DBRole, Depends(get_role_deps(True))]):
    try:
        delete_role(id=role.id)

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except RoleNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "role not found", "id": role},
        )
