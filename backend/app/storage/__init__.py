import logging
from app.config import settings
from app.storage.base import BaseStorage
from app.storage.local_db import LocalSqliteStorage

logger = logging.getLogger("cloudshield.storage")

_storage_instance: BaseStorage = None

def get_storage() -> BaseStorage:
    global _storage_instance
    if _storage_instance is None:
        if settings.AWS_MODE:
            try:
                from app.storage.dynamodb import DynamoDBStorage
                logger.info("Initializing Amazon DynamoDB Storage backend (AWS Mode)")
                _storage_instance = DynamoDBStorage()
            except Exception as e:
                logger.warning(
                    f"Failed to connect to DynamoDB ({e}). Falling back to Local SQLite storage for safety."
                )
                _storage_instance = LocalSqliteStorage()
        else:
            logger.info("Initializing Local SQLite storage (Development/Local Simulation Mode)")
            _storage_instance = LocalSqliteStorage()
    return _storage_instance
