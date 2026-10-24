import json
import logging
import uuid
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

from app.config import settings
from app.models.schemas import (
    SecurityEvent,
    Incident,
    IncidentStatus,
    StatusUpdateEntry,
    SeverityLevel,
    SourcePlatform
)
from app.storage.base import BaseStorage

logger = logging.getLogger("cloudshield.dynamodb")

class DynamoDBStorage(BaseStorage):
    def __init__(self):
        self.region = settings.AWS_REGION
        self.events_table_name = settings.DYNAMODB_EVENTS_TABLE
        self.incidents_table_name = settings.DYNAMODB_INCIDENTS_TABLE
        self.integration_table_name = settings.DYNAMODB_INTEGRATION_TABLE
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region)
        self.events_table = self.dynamodb.Table(self.events_table_name)
        self.incidents_table = self.dynamodb.Table(self.incidents_table_name)
        self.integration_table = self.dynamodb.Table(self.integration_table_name)

    def save_event(self, event: SecurityEvent) -> SecurityEvent:
        item = {
            "event_id": event.event_id,
            "timestamp": event.timestamp,
            "event_type": event.event_type,
            "test_user": event.test_user,
            "source_ip": event.source_ip,
            "resource": event.resource,
            "action": event.action,
            "source_platform": event.source_platform.value,
            "source_event_id": event.source_event_id or "",
            "campaign_id": event.campaign_id or "",
            "campaign_name": event.campaign_name or "",
            "session_id": event.session_id or "NONE",
            "request_count": event.request_count or 1,
            "raw_payload": json.dumps(event.raw_payload),
            "processed": 1 if event.processed else 0,
            "detection_result": event.detection_result,
            "risk_score": event.risk_score,
            "severity": event.severity.value,
            "triggered_rules": json.dumps(event.triggered_rules),
            "detection_reasons": json.dumps(event.detection_reasons),
            "processed_by": event.processed_by,
            "incident_id": event.incident_id or ""
        }
        self.events_table.put_item(Item=item)
        return event

    def get_event(self, event_id: str) -> Optional[SecurityEvent]:
        try:
            response = self.events_table.get_item(Key={"event_id": event_id})
            item = response.get("Item")
            if not item:
                return None
            return self._item_to_event(item)
        except ClientError as e:
            logger.error(f"Error fetching event {event_id} from DynamoDB: {e}")
            return None

    def list_events(
        self,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        source_platform: Optional[str] = None,
        campaign_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[SecurityEvent], int]:
        response = self.events_table.scan(Limit=limit + offset + 50)
        items = response.get("Items", [])
        events = [self._item_to_event(i) for i in items]
        events.sort(key=lambda x: x.timestamp, reverse=True)

        if severity and severity.upper() != "ALL":
            events = [e for e in events if e.severity.value == severity.upper()]
        if event_type and event_type.upper() != "ALL":
            events = [e for e in events if e.event_type == event_type]
        if source_platform and source_platform.upper() != "ALL":
            events = [e for e in events if e.source_platform.value == source_platform.upper()]
        if campaign_id:
            events = [e for e in events if e.campaign_id == campaign_id]
        if search and search.strip():
            s = search.strip().lower()
            events = [
                e for e in events
                if s in e.event_id.lower() or s in e.test_user.lower() or s in e.source_ip.lower() or s in e.action.lower() or (e.campaign_name and s in e.campaign_name.lower())
            ]

        total = len(events)
        paginated = events[offset : offset + limit]
        return paginated, total

    def get_recent_events_by_user(self, test_user: str, limit: int = 20) -> List[SecurityEvent]:
        response = self.events_table.scan(
            FilterExpression="test_user = :u",
            ExpressionAttributeValues={":u": test_user}
        )
        items = response.get("Items", [])
        events = [self._item_to_event(i) for i in items]
        events.sort(key=lambda x: x.timestamp, reverse=True)
        return events[:limit]

    def get_recent_events_by_ip(self, source_ip: str, limit: int = 50) -> List[SecurityEvent]:
        response = self.events_table.scan(
            FilterExpression="source_ip = :ip",
            ExpressionAttributeValues={":ip": source_ip}
        )
        items = response.get("Items", [])
        events = [self._item_to_event(i) for i in items]
        events.sort(key=lambda x: x.timestamp, reverse=True)
        return events[:limit]

    def save_incident(self, incident: Incident) -> Incident:
        item = {
            "incident_id": incident.incident_id,
            "event_id": incident.event_id,
            "campaign_id": incident.campaign_id or "",
            "campaign_name": incident.campaign_name or "",
            "threat_type": incident.threat_type,
            "severity": incident.severity.value,
            "risk_score": incident.risk_score,
            "test_user": incident.test_user,
            "source_ip": incident.source_ip,
            "resource": incident.resource,
            "detected_at": incident.detected_at,
            "reasons": json.dumps(incident.reasons),
            "triggered_rules": json.dumps(incident.triggered_rules),
            "status": incident.status.value,
            "status_history": json.dumps([h.model_dump() for h in incident.status_history]),
            "processed_by": incident.processed_by,
            "source_platform": incident.source_platform.value,
            "notified_via_sns": 1 if incident.notified_via_sns else 0,
            "sqs_message_id": incident.sqs_message_id or "",
            "last_updated_at": incident.last_updated_at
        }
        self.incidents_table.put_item(Item=item)
        return incident

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        try:
            response = self.incidents_table.get_item(Key={"incident_id": incident_id})
            item = response.get("Item")
            if not item:
                return None
            return self._item_to_incident(item)
        except ClientError as e:
            logger.error(f"Error fetching incident {incident_id} from DynamoDB: {e}")
            return None

    def get_incident_by_event_id(self, event_id: str) -> Optional[Incident]:
        response = self.incidents_table.scan(
            FilterExpression="event_id = :eid",
            ExpressionAttributeValues={":eid": event_id}
        )
        items = response.get("Items", [])
        if items:
            return self._item_to_incident(items[0])
        return None

    def list_incidents(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        source_platform: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Incident], int]:
        response = self.incidents_table.scan()
        items = response.get("Items", [])
        incidents = [self._item_to_incident(i) for i in items]
        incidents.sort(key=lambda x: x.detected_at, reverse=True)

        if severity and severity.upper() != "ALL":
            incidents = [i for i in incidents if i.severity.value == severity.upper()]
        if status and status.upper() != "ALL":
            incidents = [i for i in incidents if i.status.value == status.upper()]
        if source_platform and source_platform.upper() != "ALL":
            incidents = [i for i in incidents if i.source_platform.value == source_platform.upper()]
        if search and search.strip():
            s = search.strip().lower()
            incidents = [
                i for i in incidents
                if s in i.incident_id.lower() or s in i.threat_type.lower() or s in i.test_user.lower() or (i.campaign_name and s in i.campaign_name.lower())
            ]

        total = len(incidents)
        paginated = incidents[offset : offset + limit]
        return paginated, total

    def update_incident_status(
        self,
        incident_id: str,
        new_status: IncidentStatus,
        updated_by: str,
        note: Optional[str] = ""
    ) -> Optional[Incident]:
        incident = self.get_incident(incident_id)
        if not incident:
            return None
        now_str = datetime.now(timezone.utc).isoformat()
        old_status = incident.status
        incident.status = new_status
        incident.last_updated_at = now_str
        incident.status_history.append(
            StatusUpdateEntry(
                from_status=old_status,
                to_status=new_status,
                updated_at=now_str,
                updated_by=updated_by,
                note=note or ""
            )
        )
        return self.save_incident(incident)

    def save_integration_status(self, name: str, data: Dict[str, Any]):
        try:
            self.integration_table.put_item(Item={
                "integration_name": name,
                "data": json.dumps(data),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error saving integration status to DynamoDB: {e}")

    def get_integration_status(self, name: str) -> Optional[Dict[str, Any]]:
        try:
            resp = self.integration_table.get_item(Key={"integration_name": name})
            item = resp.get("Item")
            return json.loads(item["data"]) if item else None
        except Exception as e:
            logger.error(f"Error fetching integration status from DynamoDB: {e}")
            return None

    def get_dashboard_counts(self) -> Dict[str, Any]:
        events_resp = self.events_table.scan()
        events = events_resp.get("Items", [])
        incidents_resp = self.incidents_table.scan()
        incidents = incidents_resp.get("Items", [])

        total_events = len(events)
        detected_threats = sum(1 for e in events if int(e.get("risk_score", 0)) > 30)
        high_risk_incidents = sum(1 for i in incidents if i.get("severity") == "HIGH")
        critical_incidents = sum(1 for i in incidents if i.get("severity") == "CRITICAL")
        open_incidents = sum(1 for i in incidents if i.get("status") == "OPEN")
        investigating_incidents = sum(1 for i in incidents if i.get("status") == "INVESTIGATING")
        resolved_incidents = sum(1 for i in incidents if i.get("status") == "RESOLVED")

        high_crit = [i for i in incidents if i.get("severity") in ["HIGH", "CRITICAL"]]
        high_crit.sort(key=lambda x: str(x.get("detected_at") or x.get("timestamp") or ""), reverse=True)
        last_alert_time = (high_crit[0].get("detected_at") or high_crit[0].get("timestamp")) if high_crit else None

        caniphish_events_count = sum(1 for e in events if e.get("source_platform") == "CANIPHISH")
        camp_ids = set(e.get("campaign_id") for e in events if e.get("campaign_id"))
        caniphish_campaigns_count = len(camp_ids)
        caniphish_payload_clicks = sum(1 for e in events if e.get("source_platform") == "CANIPHISH" and ("click" in str(e.get("event_type", "")).lower() or e.get("event_type") == "payloadClicked"))
        caniphish_compromises = sum(1 for e in events if e.get("source_platform") == "CANIPHISH" and ("compromise" in str(e.get("event_type", "")).lower() or e.get("event_type") == "employeeCompromised"))
        caniphish_emails_reported = sum(1 for e in events if e.get("source_platform") == "CANIPHISH" and ("report" in str(e.get("event_type", "")).lower() or e.get("event_type") == "emailReported"))

        return {
            "total_events": total_events,
            "detected_threats": detected_threats,
            "high_risk_incidents": high_risk_incidents,
            "critical_incidents": critical_incidents,
            "open_incidents": open_incidents,
            "investigating_incidents": investigating_incidents,
            "resolved_incidents": resolved_incidents,
            "last_alert_time": last_alert_time,
            "caniphish_events_count": caniphish_events_count,
            "caniphish_campaigns_count": caniphish_campaigns_count,
            "caniphish_payload_clicks": caniphish_payload_clicks,
            "caniphish_compromises": caniphish_compromises,
            "caniphish_emails_reported": caniphish_emails_reported
        }

    def get_time_series_data(self) -> List[Dict[str, Any]]:
        events_resp = self.events_table.scan()
        events = events_resp.get("Items", [])
        slots: Dict[str, Dict[str, int]] = {}
        for e in events:
            ts = str(e.get("timestamp") or e.get("received_at") or "")[:16]
            if not ts:
                continue
            if ts not in slots:
                slots[ts] = {"events_count": 0, "threats_count": 0}
            slots[ts]["events_count"] += 1
            if int(e.get("risk_score", 0)) > 30:
                slots[ts]["threats_count"] += 1
        
        sorted_keys = sorted(slots.keys())[-24:]
        return [
            {"timestamp": k, "events_count": slots[k]["events_count"], "threats_count": slots[k]["threats_count"]}
            for k in sorted_keys
        ]

    def _item_to_event(self, item: dict) -> SecurityEvent:
        platform_str = item.get("source_platform", "LOCAL_SIMULATION")
        try:
            platform = SourcePlatform(platform_str)
        except (ValueError, TypeError):
            platform = SourcePlatform.LOCAL_SIMULATION

        sev_raw = str(item.get("severity") or item.get("risk_level") or "LOW").upper()
        try:
            sev = SeverityLevel(sev_raw)
        except (ValueError, TypeError):
            sev = SeverityLevel.LOW

        raw_p = item.get("raw_payload") or item.get("raw_event") or "{}"
        if isinstance(raw_p, str):
            try:
                raw_payload = json.loads(raw_p)
            except Exception:
                raw_payload = {"raw": raw_p}
        elif isinstance(raw_p, dict):
            raw_payload = raw_p
        else:
            raw_payload = {}

        tr = item.get("triggered_rules", "[]")
        if isinstance(tr, str):
            try:
                triggered_rules = json.loads(tr)
            except Exception:
                triggered_rules = [tr] if tr else []
        elif isinstance(tr, list):
            triggered_rules = tr
        else:
            triggered_rules = []

        dr = item.get("detection_reasons", "[]")
        if isinstance(dr, str):
            try:
                detection_reasons = json.loads(dr)
            except Exception:
                detection_reasons = [dr] if dr else []
        elif isinstance(dr, list):
            detection_reasons = dr
        else:
            detection_reasons = []

        event_id = str(item.get("event_id") or uuid.uuid4())
        ts = str(item.get("timestamp") or item.get("received_at") or datetime.now(timezone.utc).isoformat())
        event_type = str(item.get("event_type") or "UNKNOWN")
        test_user = str(item.get("test_user") or item.get("user") or "unknown@cloudshield.internal")
        source_ip = str(item.get("source_ip") or "0.0.0.0")
        resource = str(item.get("resource") or "/aws/cloudshield")
        action = str(item.get("action") or "MONITOR")
        detection_result = str(item.get("detection_result") or ("THREAT" if sev in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] else "CLEAN"))
        risk_score = int(item.get("risk_score", 0))

        return SecurityEvent(
            event_id=event_id,
            timestamp=ts,
            event_type=event_type,
            test_user=test_user,
            source_ip=source_ip,
            resource=resource,
            action=action,
            source_platform=platform,
            source_event_id=item.get("source_event_id") or None,
            campaign_id=item.get("campaign_id") or None,
            campaign_name=item.get("campaign_name") or None,
            session_id=item.get("session_id"),
            request_count=int(item.get("request_count", 1)),
            raw_payload=raw_payload,
            processed=bool(item.get("processed", 1)),
            detection_result=detection_result,
            risk_score=risk_score,
            severity=sev,
            triggered_rules=triggered_rules,
            detection_reasons=detection_reasons,
            processed_by=item.get("processed_by", "AWS_LAMBDA_WORKFLOW"),
            incident_id=item.get("incident_id") or None
        )

    def _item_to_incident(self, item: dict) -> Incident:
        raw_history = item.get("status_history", "[]")
        if isinstance(raw_history, str):
            try:
                raw_history = json.loads(raw_history)
            except Exception:
                raw_history = []
        history = []
        for h in (raw_history if isinstance(raw_history, list) else []):
            try:
                history.append(StatusUpdateEntry(**h))
            except Exception:
                pass

        platform_str = item.get("source_platform", "LOCAL_SIMULATION")
        try:
            platform = SourcePlatform(platform_str)
        except (ValueError, TypeError):
            platform = SourcePlatform.LOCAL_SIMULATION

        sev_raw = str(item.get("severity") or item.get("risk_level") or "MEDIUM").upper()
        try:
            sev = SeverityLevel(sev_raw)
        except (ValueError, TypeError):
            sev = SeverityLevel.MEDIUM

        status_raw = str(item.get("status") or "OPEN").upper()
        try:
            status = IncidentStatus(status_raw)
        except (ValueError, TypeError):
            status = IncidentStatus.OPEN

        reasons = item.get("reasons", "[]")
        if isinstance(reasons, str):
            try:
                reasons = json.loads(reasons)
            except Exception:
                reasons = [reasons] if reasons else []

        triggered_rules = item.get("triggered_rules", "[]")
        if isinstance(triggered_rules, str):
            try:
                triggered_rules = json.loads(triggered_rules)
            except Exception:
                triggered_rules = [triggered_rules] if triggered_rules else []

        return Incident(
            incident_id=str(item.get("incident_id") or f"inc-{item.get('event_id', uuid.uuid4())}"),
            event_id=str(item.get("event_id") or "unknown"),
            campaign_id=item.get("campaign_id") or None,
            campaign_name=item.get("campaign_name") or None,
            threat_type=str(item.get("threat_type") or "SECURITY_THREAT"),
            severity=sev,
            risk_score=int(item.get("risk_score", 50)),
            test_user=str(item.get("test_user") or item.get("user") or "unknown"),
            source_ip=str(item.get("source_ip") or "0.0.0.0"),
            resource=str(item.get("resource") or "/aws/cloudshield"),
            detected_at=str(item.get("detected_at") or item.get("timestamp") or datetime.now(timezone.utc).isoformat()),
            reasons=reasons if isinstance(reasons, list) else [],
            triggered_rules=triggered_rules if isinstance(triggered_rules, list) else [],
            status=status,
            status_history=history,
            processed_by=str(item.get("processed_by", "AWS_LAMBDA")),
            source_platform=platform,
            notified_via_sns=bool(item.get("notified_via_sns", 0)),
            sqs_message_id=item.get("sqs_message_id") or None,
            last_updated_at=str(item.get("last_updated_at") or datetime.now(timezone.utc).isoformat())
        )

    def get_user_access_status(self, user_identifier: str) -> Dict[str, Any]:
        return {
            "user_identifier": user_identifier,
            "status": "ACTIVE",
            "reason": None,
            "suspended_until": None,
            "duration_minutes": None,
            "updated_by": "system",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

    def set_user_access_status(
        self,
        user_identifier: str,
        status: str,
        updated_by: str,
        reason: Optional[str] = None,
        suspended_until: Optional[str] = None,
        duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        now_str = datetime.now(timezone.utc).isoformat()
        return {
            "user_identifier": user_identifier,
            "status": status,
            "updated_by": updated_by,
            "reason": reason,
            "suspended_until": suspended_until,
            "duration_minutes": duration_minutes,
            "updated_at": now_str
        }

    def list_user_access_controls(self) -> List[Dict[str, Any]]:
        return []

