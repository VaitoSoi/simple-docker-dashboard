import os
import re
from typing import List, Set
from uuid import UUID

from argon2.exceptions import VerifyMismatchError
from pydantic import BaseModel
from sqlmodel import JSON, Column, Field, Session, SQLModel, create_engine, select

from lib.enums import Permission, default_permission
from lib.errors import (
    InvalidPassword,
    InvalidRoleName,
    InvalidUsername,
    MissingError,
    NotAllowed,
    RoleExisted,
    RoleNotFound,
    UserExisted,
    UserNotFound,
    WrongPassword,
)
from lib.hash import hash_func, verify_func


class DBUserBase(SQLModel):
    __tablename__ = "user" # type: ignore
    id: str = Field(default_factory=lambda: UUID().__str__(), primary_key=True)
    username: str = Field(unique=True, primary_key=True)

class DBUser(DBUserBase, table=True):
    password: str
    roles: List[str] = Field(default=[], sa_column=Column(JSON))

class User(DBUserBase):
    permissions: List[Permission] = Field(default=[], sa_column=Column(JSON))

class APIUser(BaseModel):
    username: str
    password: str


class DBRole(SQLModel, table=True):
    __tablename__ = "role" # type: ignore
    id: str = Field(default_factory=lambda: UUID().__str__(), primary_key=True)
    name: str = Field(unique=True)
    permissions: List[int] = Field(sa_column=Column(JSON))

class APIRole(BaseModel):
    name: str
    permissions: list[Permission]


engine = create_engine(os.getenv("DB_URL", "sqlite:///database.db"))
SQLModel.metadata.create_all(engine)


def _convert_permissions_to_enum(permission_values: List[int]) -> List[Permission]:
    """Convert list of permission values to Permission enum objects"""
    return [Permission(value) for value in permission_values]


def _convert_permissions_to_values(permissions: List[Permission]) -> List[int]:
    """Convert list of Permission enum objects to values"""
    return [p.value for p in permissions]


def ensure_default():
    try:
        get_role("@admin")
    except RoleNotFound:
        _new_role(
            DBRole(id="@admin", name="Admin", permissions=[Permission.Administrator.value])
        )

    try:
        get_role("@everyone")
    except RoleNotFound:
        _new_role(
            DBRole(id="@everyone", name="@everyone", permissions=[p.value for p in default_permission])
        )

    try:
        get_user(id="admin")
    except UserNotFound:
        _new_user(DBUser(id="admin", username="admin", password="ADMIN", roles=["@admin"]))


"""
USERS
"""


# GET
def _calculate_permission(user: DBUser):
    permissions: Set[Permission] = set()
    for role_id in user.roles:
        try:
            role = get_role(role_id)
        except RoleNotFound:
            continue

        # Convert permission values back to enum objects
        role_permissions = _convert_permissions_to_enum(role.permissions)
        permissions.update(role_permissions)

    return list(permissions)

def get_users() -> List[User]:
    with Session(engine) as session:
        statement = select(DBUser)
        users = list(session.exec(statement).all())
        formatted_users: List[User] = []
        
        for user in users:
            permissions = _calculate_permission(user)
            formatted_users.append(User(**user.model_dump(), permissions=permissions))

        return formatted_users


def get_user_db(
    id: str | None = None, username: str | None = None, session: Session | None = None
) -> DBUser:
    if not id and not username:
        raise MissingError()

    def __get_user(session: Session):
        user: DBUser | None = None
        statement = select(DBUser)
        for condition in [DBUser.id == id, DBUser.username == username]:
            datas = session.exec(statement.where(condition))
            user = datas.first()
            if user:
                break

        return user

    user: DBUser | None = None
    if session:
        user = __get_user(session)
    else:
        with Session(engine) as session:
            user = __get_user(session)

    if not user:
        raise UserNotFound()
    return user


def get_user(id: str | None = None, username: str | None = None) -> User:
    user: DBUser = get_user_db(id=id, username=username)
    permissions = _calculate_permission(user)
    return User(**user.model_dump(), permissions=permissions)


def verify_user(
    input_password: str,
    id: str | None = None,
    username: str | None = None,
    user: DBUser | None = None,
):
    user = user or get_user_db(id=id, username=username)

    try:
        return verify_func(user.password, input_password)

    except (AssertionError, VerifyMismatchError):
        raise WrongPassword()


# NEW

def _new_user(new_user: DBUser):
    with Session(engine) as session:
        try:
            exist_user = get_user_db(username=new_user.username, session=session)
            if exist_user:
                raise UserExisted()
        except UserNotFound:
            ...

        session.add(new_user)
        session.commit()

        return get_user_db(username=new_user.username, session=session)


def new_user(new_user: APIUser):
    if not _check_valid_username(new_user.username):
        raise InvalidUsername()

    if not _check_password_safety(new_user.password):
        raise InvalidPassword()
        
    return _new_user(DBUser(username=new_user.username, password=new_user.password))


username_regexp = re.compile(r"^[a-z0-9_]+$")


def _check_valid_username(username: str):
    return username_regexp.match(username)


def _check_password_safety(password: str):
    return password.__len__() >= 8


# UPDATE
def update_user(
    new_user: APIUser, id: str | None = None, username: str | None = None
):
    with Session(engine) as session:
        db_user = get_user_db(id=id, username=username, session=session)
        db_user_dump = db_user.model_dump()

        for key, value in new_user.model_dump().items():
            if key == "id":
                continue

            if db_user_dump[key] != value:
                if key == "username" and not _check_valid_username(value):
                    raise InvalidUsername()

                if key == "password":
                    if not _check_password_safety(new_user.password):
                        raise InvalidPassword()

                    value = hash_func(value)

                setattr(db_user, key, value)

        session.add(db_user)
        session.commit()

        return get_user_db(username=new_user.username, session=session)


# DELETE
def delete_user(
    id: str | None = None,
    username: str | None = None,
):
    with Session(engine) as session:
        exist_user = get_user_db(id=id, username=username, session=session)
        session.delete(exist_user)
        session.commit()


# UTILITY
def user_has_permission(user: User, permissions: List[Permission]) -> bool:
    if Permission.Administrator in user.permissions:
        return True

    everyone = get_role(id="@everyone")

    for permission in permissions:
        if permission in everyone.permissions:
            continue

        permission_bit = permission.value.__int__()

        if permission_bit >= 10:
            s_prefix, s_suffix = permission_bit.__str__().split("", 1)
            prefix = int(s_prefix)
            suffix = int(s_suffix)

            if (
                suffix != 0
                and Permission(prefix * s_suffix.__len__()) in user.permissions
            ):
                continue

        if permission not in user.permissions:
            return False

    return True


"""
ROLES
"""


# GET
def get_roles() -> List[DBRole]:
    with Session(engine) as session:
        statement = select(DBRole)
        return list(session.exec(statement).all())


def get_role(
    id: str | None = None, name: str | None = None, session: Session | None = None
) -> DBRole:
    if not id and not name:
        raise MissingError()

    def __get_role(session: Session):
        role: DBRole | None = None
        statement = select(DBRole)
        for condition in [DBRole.id == id, DBRole.name == name]:
            datas = session.exec(statement.where(condition))
            role = datas.first()
            if role:
                break

        return role

    role: DBRole | None = None

    if session:
        role = __get_role(session)
    else:
        with Session(engine) as session:
            role = __get_role(session)

    if not role:
        raise RoleNotFound()
    return role


# NEW

def _new_role(new_role: DBRole):
    with Session(engine) as session:
        try:
            exist_role = get_role(id=new_role.id, name=new_role.name, session=session)
            if exist_role:
                raise RoleExisted()
        except RoleNotFound:
            ...

        session.add(new_role)
        session.commit()

        return get_role(name=new_role.name, session=session)


def new_role(new_role: APIRole):
    if not check_role_name(new_role.name):
        raise InvalidRoleName()

    return _new_role(
        DBRole(name=new_role.name, permissions=_convert_permissions_to_values(new_role.permissions))
    )

rolename_regexp = re.compile(r"^[a-zA-Z0-9_]+$")

def check_role_name(name: str) -> bool:
    return bool(rolename_regexp.match(name))

# UPDATE
def update_role(new_role: APIRole, id: str | None = None, name: str | None = None):
    with Session(engine) as session:
        db_role = get_role(id=id, name=name, session=session)

        if db_role.id == "@admin":
            raise NotAllowed()

        db_role_dump = db_role.model_dump()

        for key, value in new_role.model_dump().items():
            if key == "id":
                continue

            if db_role_dump[key] != value:
                setattr(db_role, key, value)

        session.add(db_role)
        session.commit()

        return get_role(id=id, name=new_role.name, session=session)


# DELETE
def delete_role(id: str | None = None, name: str | None = None):
    with Session(engine) as session:
        exist_role = get_role(id=id, name=name, session=session)
        session.delete(exist_role)
        session.commit()


# UTILITY
def update_roles(user: User, roles: List[DBRole]):
    with Session(engine) as session:
        db_user = DBUser(**user.model_dump())
        
        db_user.roles = [role.id for role in roles]

        session.add(db_user)

        return get_user_db(id=user.id, session=session)
