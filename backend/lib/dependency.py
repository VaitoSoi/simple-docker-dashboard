from typing import Annotated, List

from fastapi import HTTPException, Query, status

from lib.db import DBRole, get_role, get_user
from lib.errors import MissingError, RoleNotFound, UserNotFound


def get_user_deps(require: bool = False):
    def wrapper(target: Annotated[str | None, Query()] = None):
        if not target and require:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "require target id"},
            )

        try:
            return get_user(id=target)

        except MissingError:
            if require:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "require target id"},
                )

            else:
                return None

        except UserNotFound:
            if require:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"message": "user not found", "id": target},
                )
            else:
                return None

    return wrapper


def get_roles_deps(roles: Annotated[str, Query()]):
    output_roles: List[DBRole] = []

    input_roles = roles.strip().split(",")
    for id in input_roles:
        if id == "": 
            continue
        
        try:
            role = get_role(id=id)
            output_roles.append(role)

        except RoleNotFound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "role not found", "id": id},
            )

    return output_roles


def get_role_deps(require: bool = False):
    def wrapper(id: Annotated[str | None, Query()] = None):
        if not id:
            if require:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "role id is required"},
                )
            else:
                return None

        try:
            return get_role(id=id)

        except RoleNotFound:
            if require:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "message": "role not found",
                        "id": id,
                    },
                )
            else:
                return None

    return wrapper
