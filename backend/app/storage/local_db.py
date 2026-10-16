import sqlite3
import json
import os
import threading
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from app.models.schemas import (
    SecurityEvent,
    Incident,
    IncidentStatus,
    StatusUpdateEntry,
    SeverityLevel,
    SourcePlatform
)
from app.storage.base import BaseStorage

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cloudshield_local.db")

class LocalSqliteStorage(BaseStorage):
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_events (
                    event_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    test_user TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    action TEXT NOT NULL,
                    source_platform TEXT DEFAULT 'LOCAL_SIMULATION',
                    source_event_id TEXT,
                    campaign_id TEXT,
                    campaign_name TEXT,
                    session_id TEXT,
                    request_count INTEGER DEFAULT 1,
                    raw_payload TEXT,
                    processed INTEGER DEFAULT 1,
                    detection_result TEXT,
                    risk_score INTEGER DEFAULT 0,
                    severity TEXT NOT NULL,
                    triggered_rules TEXT,
                    detection_reasons TEXT,
                    processed_by TEXT,
                    incident_id TEXT
                )
            """)
            # Migration check for existing databases
            try:
                cursor.execute("ALTER TABLE security_events ADD COLUMN source_platform TEXT DEFAULT 'LOCAL_SIMULATION'")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE security_events ADD COLUMN source_event_id TEXT")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE security_events ADD COLUMN campaign_id TEXT")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE security_events ADD COLUMN campaign_name TEXT")
            except Exception:
                pass

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON security_events (timestamp DESC)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_user ON security_events (test_user)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_platform ON security_events (source_platform)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_camp ON security_events (campaign_id)")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    incident_id TEXT PRIMARY KEY,
                    event_id TEXT UNIQUE NOT NULL,
                    campaign_id TEXT,
                    campaign_name TEXT,
                    threat_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    risk_score INTEGER NOT NULL,
                    test_user TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    detected_at TEXT NOT NULL,
                    reasons TEXT,
                    triggered_rules TEXT,
                    status TEXT NOT NULL,
                    status_history TEXT,
                    processed_by TEXT,
                    source_platform TEXT DEFAULT 'LOCAL_SIMULATION',
                    notified_via_sns INTEGER DEFAULT 0,
                    sqs_message_id TEXT,
                    last_updated_at TEXT NOT NULL
                )
            """)
            try:
                cursor.execute("ALTER TABLE incidents ADD COLUMN campaign_id TEXT")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE incidents ADD COLUMN campaign_name TEXT")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE incidents ADD COLUMN source_platform TEXT DEFAULT 'LOCAL_SIMULATION'")
            except Exception:
                pass

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_ts ON incidents (detected_at DESC)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status)")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS integration_status (
                    integration_name TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_access_controls (
                    user_identifier TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    updated_by TEXT NOT NULL,
                    reason TEXT,
                    suspended_until TEXT,
                    duration_minutes INTEGER,
                    updated_at TEXT NOT NULL
                )
            """)

            conn.commit()
            conn.close()

    def _row_to_event(self, row: sqlite3.Row) -> SecurityEvent:
        platform_val = row["source_platform"] if "source_platform" in row.keys() else "LOCAL_SIMULATION"
        return SecurityEvent(
            event_id=row["event_id"],
            timestamp=row["timestamp"],
            event_type=row["event_type"],
            test_user=row["test_user"],
            source_ip=row["source_ip"],
            resource=row["resource"],
            action=row["action"],
            source_platform=SourcePlatform(platform_val or "LOCAL_SIMULATION"),
            source_event_id=row["source_event_id"] if "source_event_id" in row.keys() else None,
            campaign_id=row["campaign_id"] if "campaign_id" in row.keys() else None,
            campaign_name=row["campaign_name"] if "campaign_name" in row.keys() else None,
            session_id=row["session_id"],
            request_count=row["request_count"],
            raw_payload=json.loads(row["raw_payload"] or "{}"),
            processed=bool(row["processed"]),
            detection_result=row["detection_result"],
            risk_score=row["risk_score"],
            severity=SeverityLevel(row["severity"]),
            triggered_rules=json.loads(row["triggered_rules"] or "[]"),
            detection_reasons=json.loads(row["detection_reasons"] or "[]"),
            processed_by=row["processed_by"],
            incident_id=row["incident_id"]
        )

    def _row_to_incident(self, row: sqlite3.Row) -> Incident:
        raw_history = json.loads(row["status_history"] or "[]")
        history = [StatusUpdateEntry(**item) for item in raw_history]
        platform_val = row["source_platform"] if "source_platform" in row.keys() else "LOCAL_SIMULATION"
        return Incident(
            incident_id=row["incident_id"],
            event_id=row["event_id"],
            campaign_id=row["campaign_id"] if "campaign_id" in row.keys() else None,
            campaign_name=row["campaign_name"] if "campaign_name" in row.keys() else None,
            threat_type=row["threat_type"],
            severity=SeverityLevel(row["severity"]),
            risk_score=row["risk_score"],
            test_user=row["test_user"],
            source_ip=row["source_ip"],
            resource=row["resource"],
            detected_at=row["detected_at"],
            reasons=json.loads(row["reasons"] or "[]"),
            triggered_rules=json.loads(row["triggered_rules"] or "[]"),
            status=IncidentStatus(row["status"]),
            status_history=history,
            processed_by=row["processed_by"],
            source_platform=SourcePlatform(platform_val or "LOCAL_SIMULATION"),
            notified_via_sns=bool(row["notified_via_sns"]),
            sqs_message_id=row["sqs_message_id"],
            last_updated_at=row["last_updated_at"]
        )

    def save_event(self, event: SecurityEvent) -> SecurityEvent:
        with self.lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO security_events (
                    event_id, timestamp, event_type, test_user, source_ip, resource,
                    action, source_platform, source_event_id, campaign_id, campaign_name,
                    session_id, request_count, raw_payload, processed,
                    detection_result, risk_score, severity, triggered_rules,
                    detection_reasons, processed_by, incident_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.timestamp,
                event.event_type,
                event.test_user,
                event.source_ip,
                event.resource,
                event.action,
                event.source_platform.value,
                event.source_event_id,
                event.campaign_id,
                event.campaign_name,
                event.session_id,
                event.request_count,
                json.dumps(event.raw_payload),
                1 if event.processed else 0,
                event.detection_result,
                event.risk_score,
                event.severity.value,
                json.dumps(event.triggered_rules),
                json.dumps(event.detection_reasons),
                event.processed_by,
                event.incident_id
            ))
            conn.commit()
            conn.close()
        return event

    def get_event(self, event_id: str) -> Optional[SecurityEvent]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM security_events WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_event(row) if row else None

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
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM security_events WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM security_events WHERE 1=1"
        params: List[Any] = []

        if severity and severity.upper() != "ALL":
            query += " AND severity = ?"
            count_query += " AND severity = ?"
            params.append(severity.upper())

        if event_type and event_type.upper() != "ALL":
            query += " AND event_type = ?"
            count_query += " AND event_type = ?"
            params.append(event_type)

        if source_platform and source_platform.upper() != "ALL":
            query += " AND source_platform = ?"
            count_query += " AND source_platform = ?"
            params.append(source_platform.upper())

        if campaign_id:
            query += " AND campaign_id = ?"
            count_query += " AND campaign_id = ?"
            params.append(campaign_id)

        if search and search.strip():
            s = f"%{search.strip()}%"
            clause = " AND (event_id LIKE ? OR test_user LIKE ? OR source_ip LIKE ? OR action LIKE ? OR resource LIKE ? OR campaign_name LIKE ?)"
            query += clause
            count_query += clause
            params.extend([s, s, s, s, s, s])

        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        exec_params = list(params) + [limit, offset]
        cursor.execute(query, exec_params)
        rows = cursor.fetchall()
        conn.close()

        events = [self._row_to_event(r) for r in rows]
        return events, total

    def get_recent_events_by_user(self, test_user: str, limit: int = 20) -> List[SecurityEvent]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM security_events WHERE test_user = ? ORDER BY timestamp DESC LIMIT ?",
            (test_user, limit)
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_event(r) for r in rows]

    def get_recent_events_by_ip(self, source_ip: str, limit: int = 50) -> List[SecurityEvent]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM security_events WHERE source_ip = ? ORDER BY timestamp DESC LIMIT ?",
            (source_ip, limit)
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_event(r) for r in rows]

    def save_incident(self, incident: Incident) -> Incident:
        with self.lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO incidents (
                    incident_id, event_id, campaign_id, campaign_name, threat_type,
                    severity, risk_score, test_user, source_ip, resource,
                    detected_at, reasons, triggered_rules, status,
                    status_history, processed_by, source_platform,
                    notified_via_sns, sqs_message_id, last_updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                incident.incident_id,
                incident.event_id,
                incident.campaign_id,
                incident.campaign_name,
                incident.threat_type,
                incident.severity.value,
                incident.risk_score,
                incident.test_user,
                incident.source_ip,
                incident.resource,
                incident.detected_at,
                json.dumps(incident.reasons),
                json.dumps(incident.triggered_rules),
                incident.status.value,
                json.dumps([h.model_dump() for h in incident.status_history]),
                incident.processed_by,
                incident.source_platform.value,
                1 if incident.notified_via_sns else 0,
                incident.sqs_message_id,
                incident.last_updated_at
            ))
            conn.commit()
            conn.close()
        return incident

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_incident(row) if row else None

    def get_incident_by_event_id(self, event_id: str) -> Optional[Incident]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_incident(row) if row else None

    def list_incidents(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        source_platform: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Incident], int]:
        conn = self._get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM incidents WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM incidents WHERE 1=1"
        params: List[Any] = []

        if severity and severity.upper() != "ALL":
            query += " AND severity = ?"
            count_query += " AND severity = ?"
            params.append(severity.upper())

        if status and status.upper() != "ALL":
            query += " AND status = ?"
            count_query += " AND status = ?"
            params.append(status.upper())

        if source_platform and source_platform.upper() != "ALL":
            query += " AND source_platform = ?"
            count_query += " AND source_platform = ?"
            params.append(source_platform.upper())

        if search and search.strip():
            s = f"%{search.strip()}%"
            clause = " AND (incident_id LIKE ? OR event_id LIKE ? OR threat_type LIKE ? OR test_user LIKE ? OR source_ip LIKE ? OR campaign_name LIKE ?)"
            query += clause
            count_query += clause
            params.extend([s, s, s, s, s, s])

        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY detected_at DESC LIMIT ? OFFSET ?"
        exec_params = list(params) + [limit, offset]
        cursor.execute(query, exec_params)
        rows = cursor.fetchall()
        conn.close()

        incidents = [self._row_to_incident(r) for r in rows]
        return incidents, total

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
        with self.lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO integration_status (integration_name, data, updated_at)
                VALUES (?, ?, ?)
            """, (name, json.dumps(data), datetime.now(timezone.utc).isoformat()))
            conn.commit()
            conn.close()

    def get_integration_status(self, name: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM integration_status WHERE integration_name = ?", (name,))
        row = cursor.fetchone()
        conn.close()
        return json.loads(row["data"]) if row else None

    def get_dashboard_counts(self) -> Dict[str, Any]:
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM security_events")
        total_events = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM security_events WHERE risk_score > 30")
        detected_threats = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM incidents WHERE severity = 'HIGH'")
        high_risk_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM incidents WHERE severity = 'CRITICAL'")
        critical_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM incidents WHERE status = 'OPEN'")
        open_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM incidents WHERE status = 'INVESTIGATING'")
        investigating_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM incidents WHERE status = 'RESOLVED'")
        resolved_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT detected_at FROM incidents WHERE severity IN ('HIGH', 'CRITICAL') ORDER BY detected_at DESC LIMIT 1")
        last_alert_row = cursor.fetchone()
        last_alert_time = last_alert_row[0] if last_alert_row else None

        # CanIPhish counts
        cursor.execute("SELECT COUNT(*) FROM security_events WHERE source_platform = 'CANIPHISH'")
        caniphish_events_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT campaign_id) FROM security_events WHERE campaign_id IS NOT NULL")
        caniphish_campaigns_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM security_events WHERE source_platform = 'CANIPHISH' AND (event_type LIKE '%click%' OR event_type = 'payloadClicked')")
        caniphish_payload_clicks = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM security_events WHERE source_platform = 'CANIPHISH' AND (event_type LIKE '%compromise%' OR event_type = 'employeeCompromised')")
        caniphish_compromises = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM security_events WHERE source_platform = 'CANIPHISH' AND (event_type LIKE '%report%' OR event_type = 'emailReported')")
        caniphish_emails_reported = cursor.fetchone()[0]

        conn.close()

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
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                SUBSTR(timestamp, 1, 16) AS time_slot,
                COUNT(*) as events_count,
                SUM(CASE WHEN risk_score > 30 THEN 1 ELSE 0 END) as threats_count
            FROM security_events
            GROUP BY time_slot
            ORDER BY time_slot ASC
            LIMIT 24
        """)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return []

        return [
            {
                "timestamp": r["time_slot"],
                "events_count": r["events_count"],
                "threats_count": r["threats_count"] or 0
            }
            for r in rows
        ]

    def get_user_access_status(self, user_identifier: str) -> Dict[str, Any]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_access_controls WHERE user_identifier = ?", (user_identifier,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
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
        with self.lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_access_controls (user_identifier, status, updated_by, reason, suspended_until, duration_minutes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_identifier) DO UPDATE SET
                    status=excluded.status,
                    updated_by=excluded.updated_by,
                    reason=excluded.reason,
                    suspended_until=excluded.suspended_until,
                    duration_minutes=excluded.duration_minutes,
                    updated_at=excluded.updated_at
            """, (user_identifier, status, updated_by, reason, suspended_until, duration_minutes, now_str))
            conn.commit()
            conn.close()
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
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_access_controls ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

