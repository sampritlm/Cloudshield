import logging
from typing import Optional, Any
import boto3
from botocore.exceptions import BotoCoreError, NoCredentialsError
from app.config import settings

logger = logging.getLogger("cloudshield.aws")

def get_boto3_client(service_name: str) -> Optional[Any]:
    """
    Safely creates and returns a boto3 client for the given AWS service.
    Returns None if AWS_MODE is False or if valid AWS credentials are not configured.
    """
    if not settings.AWS_MODE:
        return None
    try:
        client = boto3.client(service_name, region_name=settings.AWS_REGION)
        return client
    except (NoCredentialsError, BotoCoreError) as e:
        logger.warning(f"Could not initialize Boto3 client for {service_name}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error creating boto3 client for {service_name}: {e}")
        return None

def check_aws_credentials_available() -> bool:
    """Verifies whether valid AWS credentials exist on the host."""
    try:
        session = boto3.Session()
        credentials = session.get_credentials()
        return credentials is not None and credentials.access_key is not None
    except Exception:
        return False
