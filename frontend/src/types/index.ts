export type UserRole = 'admin' | 'analyst' | 'user';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface SecurityEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  test_user: string;
  source_ip: string;
  resource: string;
  action: string;
  session_id?: string;
  request_count?: number;
  raw_payload: Record<string, any>;
  processed: boolean;
  detection_result: string;
  risk_score: number;
  severity: SeverityLevel;
  triggered_rules: string[];
  detection_reasons: string[];
  processed_by: string;
  incident_id?: string | null;
  source_platform?: string;
  source_event_id?: string;
  campaign_id?: string;
  campaign_name?: string;
}

export interface StatusUpdateEntry {
  from_status: IncidentStatus;
  to_status: IncidentStatus;
  updated_at: string;
  updated_by: string;
  note: string;
}

export interface Incident {
  incident_id: string;
  event_id: string;
  threat_type: string;
  severity: SeverityLevel;
  risk_score: number;
  test_user: string;
  source_ip: string;
  resource: string;
  detected_at: string;
  reasons: string[];
  triggered_rules: string[];
  status: IncidentStatus;
  status_history: StatusUpdateEntry[];
  processed_by: string;
  notified_via_sns: boolean;
  sqs_message_id?: string | null;
  last_updated_at: string;
}

export interface DashboardSummary {
  total_events: int_number;
  detected_threats: number;
  high_risk_incidents: number;
  critical_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  investigating_incidents: number;
  last_alert_time?: string | null;
  aws_mode: boolean;
  storage_type: string;
}

type int_number = number;

export interface TimeSeriesPoint {
  timestamp: string;
  events_count: number;
  threats_count: number;
}

export interface DistributionItem {
  name: string;
  value: number;
  color?: string;
}

export type SimulatorScenario =
  | 'FAILED_LOGIN'
  | 'UNUSUAL_IP'
  | 'UNAUTHORIZED_ACCESS'
  | 'HIGH_REQUEST_FREQUENCY'
  | 'COMBINED_SUSPICIOUS';

export interface ThreatSimulatorRequest {
  scenario: SimulatorScenario;
  test_user?: string;
  source_ip?: string;
  resource?: string;
  custom_attempts?: number;
}

export interface ThreatSimulatorResponse {
  scenario: SimulatorScenario;
  scenario_title: string;
  event_id: string;
  status: string;
  detection_result: string;
  risk_score: number;
  severity: SeverityLevel;
  triggered_rules: string[];
  detection_reasons: string[];
  incident_created: boolean;
  incident_id?: string | null;
  message: string;
  execution_mode: string;
}

export interface ServiceStatus {
  name: string;
  status: 'OPERATIONAL' | 'SIMULATED' | 'NOT_CONFIGURED' | 'ERROR' | 'LOCAL_STORAGE';
  details: string;
  aws_service: string;
  is_live_aws: boolean;
}

export interface SystemHealthResponse {
  system_status: string;
  app_environment: string;
  aws_mode: boolean;
  storage_backend: string;
  services: ServiceStatus[];
  processing_failures: number;
  recent_errors: string[];
  cloudwatch_metrics_ref: Record<string, string>;
}

export interface ReportSummary {
  report_id: string;
  generated_at: string;
  generated_by: string;
  total_events: number;
  threat_categories: Record<string, number>;
  severity_distribution: Record<string, number>;
  risk_score_stats: {
    average: number;
    maximum: number;
    minimum: number;
  };
  open_incidents_count: number;
  resolved_incidents_count: number;
  stored_in_s3: boolean;
  s3_key?: string | null;
}

// Admin Specific Types
export interface AlertItem {
  alert_id: string;
  incident_id: string;
  threat_type: string;
  severity: SeverityLevel;
  risk_score: number;
  test_user: string;
  source_ip: string;
  resource: string;
  detected_at: string;
  notified_via_sns: boolean;
  sns_status: 'PUBLISHED' | 'SENT_SIMULATED' | 'FAILED' | 'PENDING_DELIVERY';
  topic_arn?: string;
  sqs_message_id?: string | null;
  reasons: string[];
  incident_status: string;
}

export interface CanIPhishStatus {
  integration_name: string;
  connection_status: string;
  api_base_url: string;
  tenant_id?: string;
  authenticated_email?: string;
  is_admin: boolean;
  is_write_entitled: boolean;
  is_enterprise_entitled: boolean;
  plan_name?: string;
  remaining_api_quota?: number;
  api_quota_limit?: number;
  api_quota_used?: number;
  last_successful_sync?: string;
  last_error?: string;
  latest_webhook_event?: Record<string, any>;
  webhook_url?: string;
  webhook_configured: boolean;
  missing_entitlements?: string[];
  setup_instructions?: string[];
}

export interface UserManagementItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED';
  status_reason?: string;
  status_updated_at?: string;
  status_updated_by?: string;
}

export interface SecuritySettings {
  app_name: string;
  app_env: string;
  aws_mode: boolean;
  aws_region: string;
  caniphish: {
    api_base_url: string;
    api_key_configured: boolean;
    api_key_masked: string;
    authenticated_email: string;
    tenant_id: string;
    webhook_header_name: string;
    webhook_secret_configured: boolean;
    webhook_secret_masked: string;
  };
  aws_resources: {
    dynamodb_events_table: string;
    dynamodb_incidents_table: string;
    eventbridge_bus_name: string;
    sqs_queue_url: string;
    sns_topic_arn: string;
    s3_reports_bucket: string;
    cloudwatch_log_group: string;
  };
  detection_thresholds: {
    failed_login_threshold: number;
    failed_login_window_seconds: number;
    high_request_freq_threshold: number;
    high_request_freq_window_seconds: number;
    trusted_ips: string[];
    restricted_resources: string[];
  };
  rule_points: Record<string, number>;
}

// Normal User Specific Types
export interface UserActivityItem {
  type: 'REPORTED' | 'CLICKED' | 'DELIVERED';
  title: string;
  timestamp: string;
  badge: string;
  badge_color: string;
}

export interface UserPerformancePoint {
  timestamp: string;
  date: string;
  score: number;
  campaign: string;
  outcome: string;
}

export interface UserOutcomeTip {
  id: string;
  category: string;
  title: string;
  tip: string;
  severity: string;
  icon: string;
}

export interface UserTrainingProgress {
  completion_percentage: number;
  completed_count: number;
  total_lessons: number;
  modules: LearningLesson[];
  next_recommended?: LearningLesson | null;
}

export interface UserDashboardSummary {
  user_name: string;
  user_email: string;
  role: string;
  awareness_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_category_title: string;
  simulations_received: number;
  links_clicked: number;
  emails_reported: number;
  training_completion_rate: number;
  recent_activity: UserActivityItem[];
  latest_simulations?: UserSimulationItem[];
  performance_over_time?: UserPerformancePoint[];
  outcome_based_tips?: UserOutcomeTip[];
  training_progress?: UserTrainingProgress;
}

export interface UserSimulationItem {
  simulation_id: string;
  campaign_name: string;
  campaign_id?: string;
  received_at: string;
  delivery_status: 'DELIVERED' | 'FAILED';
  link_clicked: boolean;
  clicked_at?: string | null;
  email_reported: boolean;
  reported_at?: string | null;
  training_status: 'COMPLETED' | 'RECOMMENDED' | 'NOT_REQUIRED';
  risk_score: number;
  severity: SeverityLevel;
  explanation: string;
}

export interface UserSecurityInsights {
  awareness_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH';
  category_label: string;
  current_score: number;
  previous_score: number;
  score_delta: number;
  reasons: string[];
  recommendations: string[];
  methodology_explanation: string;
}

export interface LearningLesson {
  id: string;
  title: string;
  category: string;
  duration: string;
  badge?: string;
  description: string;
  key_takeaways: string[];
  completed: boolean;
  completed_at?: string | null;
}

export interface UserNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'SIMULATION' | 'TRAINING' | 'SECURITY_ALERT' | 'INFO';
  timestamp: string;
  read: boolean;
}

