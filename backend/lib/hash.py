import os
from typing import Callable

from argon2 import PasswordHasher

argon2_hasher = PasswordHasher()

use_hash_func = os.getenv("USE_HASH", "true").lower() == "true"
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

