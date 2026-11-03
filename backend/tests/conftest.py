import os
import pytest

# Ensure all tests run with local simulation storage (fast, reliable, isolated)
os.environ["AWS_MODE"] = "false"

from app.config import settings
settings.AWS_MODE = False

import app.storage as storage_mod
storage_mod._storage_instance = None

