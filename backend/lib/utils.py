from typing import Any, Type, TypeVar

T = TypeVar("T")


def expect_type(value: Any, type: Type[T]) -> T:
    if not isinstance(value, type):
        raise TypeError()
    return value