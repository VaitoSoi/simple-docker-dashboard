from datetime import datetime, timedelta
from typing import Annotated, Any, Dict, Union

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, Response
from fastapi.security import OAuth2PasswordRequestForm

from lib.db import (
    APIUpdateUser,
    APIUser,
    DBUser,
    User,
    delete_user,
    get_user,
    get_user_db,
    get_users,
    new_user,
    update_user,
    verify_user,
)
from lib.dependency import get_user_deps
from lib.enums import Permission
from lib.errors import (
    InvalidPassword,
    InvalidUsername,
    MissingError,
    UserExisted,
    UserNotFound,
    WrongPassword,
)
from lib.response import HTTP_EXECEPTION_MESSAGE, MESSAGE_OK
from lib.security import (
    check_user_has_permission,
    get_user_from_token,
    signature,
    token_has_permission,
)

router = APIRouter(prefix="/user", tags=["user"])


@router.get(
    path="/me", description="Get current user", responses={200: {"model": User}}
)
def get_me(user: Annotated[User, Depends(get_user_from_token)]):
    return user


@router.post(
    "/login",
    description="Login and get token",
    responses={
        200: {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "access_token": "string",
                            "token_type": {"type": "string", "default": "bearer"},
                            "user": DBUser.model_json_schema(),
                        },
                    }
                }
            }
        },
        401: HTTP_EXECEPTION_MESSAGE("wrong password D:"),
    },
)
async def login(
    user_form: Annotated[OAuth2PasswordRequestForm, Depends()],
    expire_time: timedelta = timedelta(days=7),
) -> Dict[str, Any]:
    input_username = user_form.username
    input_password = user_form.password

    try:
        user = get_user_db(username=input_username)
    except UserNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "username not found D:", "username": input_username},
        )

    try:
        verify_user(input_password=input_password, user=user)
    except WrongPassword:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "wrong password D:"},
        )

    token = jwt.encode(  # type: ignore
        {"id": user.id, "exp": datetime.now() + expire_time},
        signature,
        algorithm="HS512",
    )
    return {"access_token": token, "token_type": "bearer", "user": user.model_dump()}


@router.get(
    "/",
    description="Get specific user by ID or Username or get all users",
    dependencies=[Depends(token_has_permission([Permission.SeeUsers]))],
    responses={
        400: HTTP_EXECEPTION_MESSAGE("missing id or username"),
        200: {"model": Union[list[User], User]},
    },
)
async def get_user_api(
    id: str | None = None, username: str | None = None, all: bool | None = None
):
    if all:
        return get_users()

    else:
        try:
            return get_user(id, username)

        except MissingError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "missing id or username"},
            )

        except UserNotFound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "user not found", "id": id, "username": username},
            )


@router.get(
    "/has_permissions",
    description="Check if current has require permssion",
    responses={
        200: MESSAGE_OK(),
    },
)
async def has_permission(
    user: Annotated[User, Depends(get_user_from_token)], permissions: str
):
    check_user_has_permission(
        user,
        [
            Permission(int(permission))
            for permission in permissions.split(",")
            if int(permission) in Permission
        ],
    )
    return JSONResponse({"message": "ok"})


@router.post(
    "/",
    description="Create new user",
    responses={
        201: {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "default": "created"},
                            "user": DBUser.model_json_schema(),
                        },
                    }
                }
            }
        },
        409: HTTP_EXECEPTION_MESSAGE("username already existed"),
        400: HTTP_EXECEPTION_MESSAGE(["invalid username", "invalid password"]),
    },
)
async def create_user(user: APIUser):
    try:
        _new_user = new_user(user)

        return JSONResponse(
            {"message": "created", "user": _new_user.model_dump()},
            status_code=status.HTTP_201_CREATED,
        )

    except UserExisted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "username already existed"},
        )

    except InvalidUsername:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid username"},
        )

    except InvalidPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid password"},
        )


@router.put(
    "/",
    description="Update current user or a specific user by ID",
    responses={
        200: {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "default": "updated"},
                            "user": DBUser.model_json_schema(),
                        },
                    }
                }
            }
        },
        409: HTTP_EXECEPTION_MESSAGE("username already existed"),
        400: HTTP_EXECEPTION_MESSAGE(["invalid username", "invalid password"]),
    },
)
def update_user_api(
    user: Annotated[User, Depends(get_user_from_token)],
    new_user: APIUpdateUser,
    target: Annotated[User | None, Depends(get_user_deps(False))],
):
    try:
        if not target or (user.id == target.id):
            new_user_ = update_user(new_user, id=user.id, username=user.username)

            return JSONResponse({"message": "updated", "user": new_user_.model_dump()})

        elif target and (user.id != target.id):
            check_user_has_permission(user, [Permission.UpdateUsers])

            new_user_ = update_user(
                id=target.id, username=target.username, new_user=new_user
            )

            return JSONResponse({"message": "updated", "user": new_user_.model_dump()})

    except UserExisted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "username already existed"},
        )

    except InvalidUsername:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid username"},
        )

    except InvalidPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid password"},
        )


@router.delete(
    path="/",
    description="Delete current user or a specific user by ID",
    responses={204: {}},
)
def delete_user_api(
    user: Annotated[User, Depends(get_user_from_token)],
    target: Annotated[User | None, Depends(get_user_deps(False))],
):
    if not target or (user.id == target.id):
        delete_user(id=user.id, username=user.username)

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    elif target and (user.id != target):
        check_user_has_permission(user, [Permission.DeleteUsers])

        delete_user(id=target.id, username=target.username)

        return Response(status_code=status.HTTP_204_NO_CONTENT)
