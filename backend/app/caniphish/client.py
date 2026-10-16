import logging
from typing import Dict, Any, Optional, Tuple, List
import httpx
from app.config import settings
from app.models.schemas import CanIPhishEntitlements, CanIPhishCampaign

logger = logging.getLogger("cloudshield.caniphish")

class CanIPhishAPIClient:
    """
    Official CanIPhish API v3 Client
    Base URL: https://api.caniphish.com/api/v3
    Authentication: X-API-Key and X-Email-Address headers
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        email_address: Optional[str] = None,
        tenant_id: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        self.api_key = api_key or settings.CANIPHISH_API_KEY
        self.email_address = email_address or settings.CANIPHISH_EMAIL_ADDRESS
        self.tenant_id = tenant_id or settings.CANIPHISH_TENANT_ID
        self.base_url = (base_url or settings.CANIPHISH_API_BASE_URL).rstrip("/")
        self.last_quota_info: Dict[str, Optional[int]] = {
            "limit": None,
            "used": None,
            "remaining": None
        }

    def is_configured(self) -> bool:
        return bool(self.api_key and self.email_address)

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key.strip(),
            "X-Email-Address": self.email_address.strip(),
        }

    def _extract_quota(self, response: httpx.Response):
        try:
            if "X-API-Quota-Limit" in response.headers:
                self.last_quota_info["limit"] = int(response.headers["X-API-Quota-Limit"])
            if "X-API-Quota-Used" in response.headers:
                self.last_quota_info["used"] = int(response.headers["X-API-Quota-Used"])
            if "X-API-Quota-Remaining" in response.headers:
                self.last_quota_info["remaining"] = int(response.headers["X-API-Quota-Remaining"])
        except Exception:
            pass

    async def get_tenant_access(self) -> Tuple[bool, Any]:
        """
        Calls POST /account/get-tenant-access to retrieve authorized tenant IDs.
        Header-only, no request body required.
        """
        if not self.is_configured():
            return False, {"error": "CanIPhish API Key or Email Address not configured in environment variables"}

        url = f"{self.base_url}/account/get-tenant-access"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=self._get_headers())
                self._extract_quota(res)
                if res.status_code == 200:
                    data = res.json()
                    # If tenant_id not explicitly set, auto-discover first tenant
                    tenants = data.get("tenantIDs", [])
                    if tenants and not self.tenant_id:
                        self.tenant_id = tenants[0]
                    return True, data
                return False, {"status": res.status_code, "error": res.text}
        except Exception as e:
            logger.error(f"Failed to query CanIPhish get-tenant-access: {e}")
            return False, {"error": str(e)}

    async def get_entitlements(self, tenant_id: Optional[str] = None) -> Tuple[bool, Any]:
        """
        Preflight endpoint: POST /account/get-entitlements
        Returns caller admin role, write entitlements, plan, and quota limits.
        """
        if not self.is_configured():
            return False, {"error": "CanIPhish credentials not configured"}

        target_tenant = tenant_id or self.tenant_id
        if not target_tenant:
            # Try auto-discovering tenant first
            success, tenant_res = await self.get_tenant_access()
            if success and self.tenant_id:
                target_tenant = self.tenant_id
            else:
                return False, {"error": "No tenant ID provided or accessible"}

        url = f"{self.base_url}/account/get-entitlements"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    url,
                    headers=self._get_headers(),
                    json={"tenantID": target_tenant}
                )
                self._extract_quota(res)
                if res.status_code == 200:
                    data = res.json()
                    entitlements = CanIPhishEntitlements(
                        isAdmin=bool(data.get("isAdmin")),
                        isWriteEntitled=bool(data.get("isWriteEntitled")),
                        isEnterpriseEntitled=bool(data.get("isEnterpriseEntitled")),
                        planName=str(data.get("planName", "Standard")),
                        apiQuota=int(data.get("apiQuota", 0)),
                        apiQuotaUsed=int(data.get("apiQuotaUsed", 0)),
                        employeeQuota=int(data.get("employeeQuota", 0)),
                        employeeQuotaUsed=int(data.get("employeeQuotaUsed", 0)),
                        quotaRemaining=self.last_quota_info["remaining"]
                    )
                    return True, entitlements.model_dump()
                return False, {"status": res.status_code, "error": res.text}
        except Exception as e:
            logger.error(f"Failed to fetch CanIPhish entitlements: {e}")
            return False, {"error": str(e)}

    async def get_all_campaigns(self, tenant_id: Optional[str] = None) -> Tuple[bool, List[CanIPhishCampaign]]:
        """
        Calls POST /reporting/get-all-phishing-campaigns to retrieve active & archived campaigns.
        """
        if not self.is_configured():
            return False, []

        target_tenant = tenant_id or self.tenant_id
        if not target_tenant:
            await self.get_tenant_access()
            target_tenant = self.tenant_id

        if not target_tenant:
            return False, []

        url = f"{self.base_url}/reporting/get-all-phishing-campaigns"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(
                    url,
                    headers=self._get_headers(),
                    json={"tenantID": target_tenant}
                )
                self._extract_quota(res)
                if res.status_code == 200:
                    data = res.json()
                    active = data.get("ActiveCampaigns", [])
                    archived = data.get("ArchivedCampaigns", [])
                    combined = []

                    for c in active:
                        combined.append(
                            CanIPhishCampaign(
                                campaignGUID=c.get("campaignGUID", ""),
                                campaignName=c.get("campaignName", "Unnamed Active Campaign"),
                                status="ACTIVE",
                                createdDate=c.get("createdDate"),
                                scheduledDate=c.get("scheduledDate"),
                                targetsCount=int(c.get("targetsCount", c.get("recipientsCount", 0))),
                                payloadInteractions=int(c.get("payloadInteractions", 0)),
                                employeesCompromised=int(c.get("employeesCompromised", 0)),
                                emailsReported=int(c.get("emailsReported", 0)),
                                deliveryFailed=int(c.get("deliveryFailed", 0)),
                                caniphishUrl=f"https://caniphish.com/reporting/campaign/{c.get('campaignGUID')}"
                            )
                        )

                    for c in archived:
                        combined.append(
                            CanIPhishCampaign(
                                campaignGUID=c.get("campaignGUID", ""),
                                campaignName=c.get("campaignName", "Historic Campaign"),
                                status="ARCHIVED",
                                createdDate=c.get("createdDate"),
                                scheduledDate=c.get("scheduledDate"),
                                targetsCount=int(c.get("targetsCount", c.get("recipientsCount", 0))),
                                payloadInteractions=int(c.get("payloadInteractions", 0)),
                                employeesCompromised=int(c.get("employeesCompromised", 0)),
                                emailsReported=int(c.get("emailsReported", 0)),
                                deliveryFailed=int(c.get("deliveryFailed", 0)),
                                caniphishUrl=f"https://caniphish.com/reporting/campaign/{c.get('campaignGUID')}"
                            )
                        )

                    return True, combined
                return False, []
        except Exception as e:
            logger.error(f"Failed to list CanIPhish campaigns: {e}")
            return False, []

    async def get_campaign_results(self, campaign_guid: str, tenant_id: Optional[str] = None) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Calls POST /reporting/get-campaign-results for per-recipient interaction details.
        """
        if not self.is_configured():
            return False, []

        target_tenant = tenant_id or self.tenant_id
        url = f"{self.base_url}/reporting/get-campaign-results"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(
                    url,
                    headers=self._get_headers(),
                    json={"tenantID": target_tenant, "campaignGUID": campaign_guid}
                )
                self._extract_quota(res)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("Results", data.get("EmployeeResults", []))
                    return True, results
                return False, []
        except Exception as e:
            logger.error(f"Failed to retrieve campaign results for {campaign_guid}: {e}")
            return False, []

    async def get_webhook_status(self, tenant_id: Optional[str] = None) -> Tuple[bool, Any]:
        """
        Calls POST /integrations/webhooks/get-webhook to view current outbound webhook configuration.
        """
        if not self.is_configured():
            return False, {"error": "CanIPhish credentials not configured"}

        target_tenant = tenant_id or self.tenant_id
        url = f"{self.base_url}/integrations/webhooks/get-webhook"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    url,
                    headers=self._get_headers(),
                    json={"tenantID": target_tenant}
                )
                self._extract_quota(res)
                if res.status_code == 200:
                    return True, res.json()
                return False, {"status": res.status_code, "error": res.text}
        except Exception as e:
            return False, {"error": str(e)}

    async def update_webhook(
        self,
        endpoint_url: str,
        secret_value: str,
        secret_header_name: str = "X-CloudShield-Secret",
        tenant_id: Optional[str] = None
    ) -> Tuple[bool, Any]:
        """
        Calls POST /integrations/webhooks/update-webhook to configure outbound webhook destination.
        """
        if not self.is_configured():
            return False, {"error": "Credentials not configured"}

        target_tenant = tenant_id or self.tenant_id
        url = f"{self.base_url}/integrations/webhooks/update-webhook"
        payload = {
            "tenantID": target_tenant,
            "endpointURL": endpoint_url,
            "customHeaderName": secret_header_name,
            "customHeaderValue": secret_value,
            "status": True,
            "events": {
                "emailReported": True,
                "payloadClicked": True,
                "employeeCompromised": True,
                "deliveryFailed": True,
                "trainingComplete": True,
                "trainingOverdue": True,
                "trainingFailed": True
            }
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=self._get_headers(), json=payload)
                self._extract_quota(res)
                if res.status_code == 200:
                    return True, res.json()
                return False, {"status": res.status_code, "error": res.text}
        except Exception as e:
            return False, {"error": str(e)}

caniphish_client = CanIPhishAPIClient()
