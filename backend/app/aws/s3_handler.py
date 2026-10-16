import os
import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.aws.client_factory import get_boto3_client

logger = logging.getLogger("cloudshield.s3")

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports_storage")
os.makedirs(REPORTS_DIR, exist_ok=True)

def upload_report_to_s3(
    file_name: str,
    content: str,
    content_type: str = "text/csv"
) -> Dict[str, Any]:
    """
    Stores generated security audit reports in Amazon S3 when AWS Mode is enabled.
    In local development mode, saves report to local filesystem under reports_storage/.
    """
    local_path = os.path.join(REPORTS_DIR, file_name)
    with open(local_path, "w", encoding="utf-8") as f:
        f.write(content)

    if not settings.AWS_MODE:
        return {
            "mode": "LOCAL_STORAGE",
            "stored_in_s3": False,
            "local_path": local_path,
            "file_name": file_name,
            "bucket": "local-disk-simulation",
            "message": "Report saved locally in backend/reports_storage/"
        }

    client = get_boto3_client("s3")
    if not client:
        return {
            "mode": "FALLBACK_LOCAL",
            "stored_in_s3": False,
            "local_path": local_path,
            "file_name": file_name,
            "error": "S3 client unavailable"
        }

    try:
        s3_key = f"audit-reports/{file_name}"
        client.put_object(
            Bucket=settings.S3_REPORTS_BUCKET,
            Key=s3_key,
            Body=content.encode("utf-8"),
            ContentType=content_type
        )
        logger.info(f"Report uploaded to S3: s3://{settings.S3_REPORTS_BUCKET}/{s3_key}")
        return {
            "mode": "AWS_S3",
            "stored_in_s3": True,
            "bucket": settings.S3_REPORTS_BUCKET,
            "s3_key": s3_key,
            "file_name": file_name,
            "local_path": local_path
        }
    except Exception as e:
        logger.error(f"Failed to upload report to S3 bucket {settings.S3_REPORTS_BUCKET}: {e}")
        return {
            "mode": "ERROR",
            "stored_in_s3": False,
            "error": str(e),
            "local_path": local_path
        }
