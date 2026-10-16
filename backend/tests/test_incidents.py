import os
import pytest
from app.models.schemas import (
    SecurityEventCreate,
    IncidentStatus
)
from app.routers.events import process_and_ingest_event
from app.storage.local_db import LocalSqliteStorage

@pytest.fixture
def temp_storage(tmp_path):
    db_file = str(tmp_path / "test_cloudshield.db")
    storage = LocalSqliteStorage(db_path=db_file)
    return storage

def test_incident_creation_and_status_transitions(temp_storage, monkeypatch):
    monkeypatch.setattr("app.routers.events.get_storage", lambda: temp_storage)
    monkeypatch.setattr("app.storage.get_storage", lambda: temp_storage)

    # Ingest High-Risk event
    event_in = SecurityEventCreate(
        event_type="LOGIN_FAILURE",
        test_user="victim.user@corp.internal",
        source_ip="198.51.100.45",  # Untrusted (+25)
        resource="/api/v1/auth/login",
        action="user_login_failed",
        request_count=5,  # (+40) -> Total 65 (HIGH)
        raw_payload={"simulated_failures": 5}
    )

    event = process_and_ingest_event(event_in, actor="test_runner")
    assert event.incident_id is not None
    assert event.risk_score >= 61

    # Verify incident persisted in storage
    incident = temp_storage.get_incident(event.incident_id)
    assert incident is not None
    assert incident.status == IncidentStatus.OPEN
    assert len(incident.status_history) >= 1

    # Status transition: OPEN -> INVESTIGATING
    updated_1 = temp_storage.update_incident_status(
        incident_id=incident.incident_id,
        new_status=IncidentStatus.INVESTIGATING,
        updated_by="Security Analyst Sarah",
        note="Reviewing IP telemetry"
    )
    assert updated_1.status == IncidentStatus.INVESTIGATING
    assert len(updated_1.status_history) == 2
    assert updated_1.status_history[-1].to_status == IncidentStatus.INVESTIGATING

    # Status transition: INVESTIGATING -> RESOLVED
    updated_2 = temp_storage.update_incident_status(
        incident_id=incident.incident_id,
        new_status=IncidentStatus.RESOLVED,
        updated_by="Security Admin Alex",
        note="Confirmed false positive test run"
    )
    assert updated_2.status == IncidentStatus.RESOLVED
    assert len(updated_2.status_history) == 3
    assert updated_2.status_history[-1].to_status == IncidentStatus.RESOLVED

def test_idempotent_duplicate_event_incident_protection(temp_storage, monkeypatch):
    """Ensure repeated processing of the same event ID does not create duplicate incidents."""
    monkeypatch.setattr("app.routers.events.get_storage", lambda: temp_storage)
    monkeypatch.setattr("app.storage.get_storage", lambda: temp_storage)

    event_in = SecurityEventCreate(
        event_type="UNAUTHORIZED_RESOURCE_ACCESS",
        test_user="target.user@corp.internal",
        source_ip="198.51.100.99",
        resource="/admin/secrets",
        action="unauthorized_read"
    )

    # First ingestion
    event = process_and_ingest_event(event_in, actor="test_runner")
    first_incident_id = event.incident_id
    assert first_incident_id is not None

    # Check database: exactly 1 incident for this event
    incident = temp_storage.get_incident_by_event_id(event.event_id)
    assert incident is not None
    assert incident.incident_id == first_incident_id

    # Count total incidents
    all_incidents, count_before = temp_storage.list_incidents()
    assert count_before == 1

    # Simulate re-evaluation of same event: should recognize existing event_id
    existing_incident = temp_storage.get_incident_by_event_id(event.event_id)
    assert existing_incident is not None

    all_incidents, count_after = temp_storage.list_incidents()
    assert count_after == 1  # No duplicate incident created!
