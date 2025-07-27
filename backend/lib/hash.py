from typing import Callable

from argon2 import PasswordHasher

from lib.env import USE_HASH as use_hash_func

argon2_hasher = PasswordHasher()

hash_func: Callable[[str], str] = \
    argon2_hasher.hash \
    if use_hash_func else \
    lambda x: x

def simple_verify(a: str, b: str):
    assert a == b
    return True

verify_func: Callable[[str, str], bool] = \
    argon2_hasher.verify \
    if use_hash_func else \
    simple_verify

