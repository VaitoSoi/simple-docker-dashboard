import hashlib
import os
from uuid import uuid4

DB_URL = os.getenv("DB_URL", "sqlite:///database.db")
SIGNATURE = os.getenv(
    "SIGNATURE", hashlib.sha256(uuid4().__str__().encode()).hexdigest()
)
USE_HASH = os.getenv("USE_HASH", "true").lower() == "true"
