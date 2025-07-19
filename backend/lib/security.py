import hashlib
import os
from typing import Annotated, List
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from lib.db import User, get_user, user_has_permission
from lib.enums import Permission
from lib.errors import UserNotFound

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/login")
signature = os.getenv(
    "SIGNATURE", hashlib.sha256(uuid4().__str__().encode()).hexdigest()
)


def decode_jwt(token: str, verify_expiration: bool = True):
    try:
        return jwt.decode(token, signature, algorithms="HS512", verify_exp=verify_expiration)  # type: ignore

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "token expired"
            }
        )

    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "invalid signature"
            }
        )


def get_user_from_token(token: Annotated[str, Depends(oauth2_scheme)]):
    decoded = decode_jwt(token)

    if "id" not in decoded:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "missing user id"}
        )

    try:
        return get_user(id=decoded["id"])

    except UserNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail={
                "message": "user not found",
                "id": decoded["id"]
            }
        )


def token_has_permission(permissions: List[Permission]):
    def wrapper(token: Annotated[str, Depends(oauth2_scheme)]):
        user = get_user_from_token(token)
        check_user_has_permission(user, permissions)

    return wrapper


def check_user_has_permission(user: User, permissions: List[Permission]):
    if not user_has_permission(user, permissions):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "missing one of permission", "permissions": permissions},
        )
