from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from app.models.schemas import SecurityEvent, Incident, IncidentStatus

class BaseStorage(ABC):
    @abstractmethod
    def save_event(self, event: SecurityEvent) -> SecurityEvent:
        pass

    @abstractmethod
    def get_event(self, event_id: str) -> Optional[SecurityEvent]:
        pass

    @abstractmethod
    def list_events(
        self,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[SecurityEvent], int]:
        pass

    @abstractmethod
    def get_recent_events_by_user(self, test_user: str, limit: int = 20) -> List[SecurityEvent]:
        pass

    @abstractmethod
    def get_recent_events_by_ip(self, source_ip: str, limit: int = 50) -> List[SecurityEvent]:
        pass

    @abstractmethod
    def save_incident(self, incident: Incident) -> Incident:
        pass

    @abstractmethod
    def get_incident(self, incident_id: str) -> Optional[Incident]:
        pass

    @abstractmethod
    def get_incident_by_event_id(self, event_id: str) -> Optional[Incident]:
        pass

    @abstractmethod
    def list_incidents(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Incident], int]:
        pass

    @abstractmethod
    def update_incident_status(
        self,
        incident_id: str,
        new_status: IncidentStatus,
        updated_by: str,
        note: Optional[str] = ""
    ) -> Optional[Incident]:
        pass

    @abstractmethod
    def save_integration_status(self, name: str, data: Dict[str, Any]):
        pass

    @abstractmethod
    def get_integration_status(self, name: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_dashboard_counts(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_time_series_data(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_user_access_status(self, user_identifier: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def set_user_access_status(
        self,
        user_identifier: str,
        status: str,
        updated_by: str,
        reason: Optional[str] = None,
        suspended_until: Optional[str] = None,
        duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def list_user_access_controls(self) -> List[Dict[str, Any]]:
        pass
