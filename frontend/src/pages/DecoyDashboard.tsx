import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Bell,
  Server,
  FileText,
  Users,
  Settings,
  Download,
  Database,
  Lock,
  Search,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  Flame,
  ArrowUpRight,
  Filter,
  Eye,
  ShieldAlert,
  Copy,
  EyeOff,
  KeyRound,
  Play,
  Zap,
  Radio,
  Clock,
  Cloud
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

type AdminTab =
  | 'overview'
  | 'events'
  | 'incidents'
  | 'alerts'
  | 'system'
  | 'reports'
  | 'users'
  | 'settings'
  | 'simulator';

export const DecoyDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [dbQueryActive, setDbQueryActive] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState<string | null>(null);
  const [selectedEventPayload, setSelectedEventPayload] = useState<any | null>(null);

  // Silent background telemetry: Every interaction records attacker behavior into the real SOC
  const recordSilentTelemetry = (interactionType: string, resourcePath?: string, actionName?: string) => {
    api.interactWithDecoy({
      interaction_type: interactionType,
      tab: currentTab,
      resource: resourcePath || `/api/v1/${interactionType}`,
      action: actionName || `ADMIN_${interactionType.toUpperCase()}_ACCESSED`
    }).catch(() => {
      // Completely silent to the attacker
    });
  };

  const handleTabChange = (tab: AdminTab) => {
    setCurrentTab(tab);
    recordSilentTelemetry('tab_navigation', `/api/v1/console/${tab}`, `CONSOLE_NAVIGATED_${tab.toUpperCase()}`);
  };

  const handleDownloadReport = () => {
    recordSilentTelemetry('export_csv', '/reports/cloudshield-security-audit-2026.csv', 'COMPLIANCE_AUDIT_CSV_EXPORTED');
    const csvContent = (
      "Event_ID,Timestamp,Actor,Resource,Risk_Score,Severity\n" +
      "EVT-8921,2026-11-02T10:00:00Z,admin@cloudshield.internal,/admin/secrets,95,CRITICAL\n" +
      "EVT-8922,2026-11-02T10:05:00Z,intern.audit@corp.internal,/api/v1/iam/credentials,45,MEDIUM\n" +
      "EVT-8923,2026-11-02T10:12:00Z,crawler.bot@darknet.io,/api/v1/export/data,35,MEDIUM\n" +
      "EVT-8924,2026-11-02T10:15:00Z,devin.clark@cloudshield.internal,/s3/production-bucket,0,LOW\n"
    );
    const element = document.createElement("a");
    const file = new Blob([csvContent], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = "cloudshield_audit_master_export.csv";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleInspectIamKey = () => {
    recordSilentTelemetry('view_credentials', '/settings/aws-credentials', 'IAM_MASTER_SECRET_KEY_REVEALED');
    setShowSecretKey(!showSecretKey);
  };

  const handleQueryDatabase = () => {
    recordSilentTelemetry('query_database', '/rds/aurora-prod-customer-vault', 'RDS_CUSTOMER_VAULT_QUERIED');
    setDbQueryActive(true);
  };

  const handleRunSimulatorScenario = (scenarioName: string) => {
    recordSilentTelemetry('run_simulation', `/simulator/run/${scenarioName}`, `SIMULATOR_SCENARIO_${scenarioName.toUpperCase()}`);
    setSimulatorStatus(`Scenario "${scenarioName}" evaluated: Pipeline healthy. 0 drift detected.`);
    setTimeout(() => setSimulatorStatus(null), 4000);
  };

  // Realistic Production Time Series Chart Data
  const telemetryTimeSeries = [
    { timestamp: '10:00', events_count: 140, threats_count: 3 },
    { timestamp: '11:00', events_count: 220, threats_count: 5 },
    { timestamp: '12:00', events_count: 190, threats_count: 2 },
    { timestamp: '13:00', events_count: 310, threats_count: 8 },
    { timestamp: '14:00', events_count: 280, threats_count: 4 },
    { timestamp: '15:00', events_count: 390, threats_count: 7 },
    { timestamp: '16:00', events_count: 450, threats_count: 11 },
  ];

  const severityDistribution = [
    { name: 'Low Risk', value: 820, color: '#0ea5e9' },
    { name: 'Medium Risk', value: 310, color: '#f59e0b' },
    { name: 'High Risk', value: 140, color: '#f97316' },
    { name: 'Critical Threats', value: 35, color: '#ef4444' },
  ];

  const securityEvents = [
    { id: 'EVT-4891', user: 'admin@cloudshield.internal', ip: '127.0.0.1', type: 'ADMIN_CONSOLE_ACCESS', resource: '/api/v1/dashboard', score: 0, severity: 'LOW', time: 'Just now' },
    { id: 'EVT-4890', user: 'sarah.soc@cloudshield.internal', ip: '10.0.0.50', type: 'INCIDENT_REVIEW', resource: '/api/v1/incidents', score: 0, severity: 'LOW', time: '2m ago' },
    { id: 'EVT-4889', user: 'unknown@external-vpn.net', ip: '198.51.100.45', type: 'FAILED_AUTHENTICATION', resource: '/api/v1/auth/login', score: 40, severity: 'HIGH', time: '5m ago' },
    { id: 'EVT-4888', user: 'devin.clark@cloudshield.internal', ip: '192.168.1.100', type: 'S3_ASSET_SYNC', resource: '/s3/production-bucket', score: 0, severity: 'LOW', time: '8m ago' },
    { id: 'EVT-4887', user: 'prober.crawler@darknet.io', ip: '185.220.101.5', type: 'DIRECTORY_PROBE', resource: '/admin/secrets', score: 85, severity: 'CRITICAL', time: '12m ago' }
  ];

  const securityIncidents = [
    { id: 'INC-7810', type: 'Repeated Failed Login Attack', severity: 'HIGH', score: 65, user: 'test.victim@corp.internal', status: 'OPEN', time: '14m ago' },
    { id: 'INC-7809', type: 'Unauthorized Cloud Resource Probe', severity: 'CRITICAL', score: 90, user: 'prober.crawler@darknet.io', status: 'INVESTIGATING', time: '28m ago' },
    { id: 'INC-7808', type: 'Abnormal API Burst Flood', severity: 'MEDIUM', score: 45, user: 'scraper.bot@external.org', status: 'RESOLVED', time: '1h ago' }
  ];

  const alertsList = [
    { id: 'ALT-1092', topic: 'cloudshield-security-alerts', severity: 'CRITICAL', message: 'Slotted Window Anomaly: 15 failed logins within 60s from IP 198.51.100.45', time: '5m ago' },
    { id: 'ALT-1091', topic: 'cloudshield-security-alerts', severity: 'HIGH', message: 'Sensitive API Probe: Multiple 403 Forbidden responses on /api/v1/auth/', time: '18m ago' },
    { id: 'ALT-1090', topic: 'cloudshield-security-alerts', severity: 'LOW', message: 'Daily Compliance Snapshot exported to S3 bucket cloudshield-audit-vault', time: '2h ago' }
  ];

  const userDirectory = [
    { name: 'Alex Vance', email: 'admin@cloudshield.internal', role: 'Security Administrator', mfa: true, lastLogin: 'Active now' },
    { name: 'Sarah Chen', email: 'sarah.soc@cloudshield.internal', role: 'SOC Lead Analyst', mfa: true, lastLogin: '12m ago' },
    { name: 'Marcus Brody', email: 'marcus.soc@cloudshield.internal', role: 'SecOps Analyst', mfa: true, lastLogin: '1h ago' },
    { name: 'Devin Clark', email: 'devin.clark@cloudshield.internal', role: 'Cloud Architect', mfa: true, lastLogin: '3h ago' },
    { name: 'Read-Only Auditor', email: 'intern.audit@corp.internal', role: 'Compliance Auditor', mfa: true, lastLogin: 'Yesterday' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Authentic Navbar - Identical to Real Admin */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">CloudShield</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-200 pl-2">
              Intelligent Cloud Security Monitoring &amp; Automated Threat Detection
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Environment Mode Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border bg-amber-50 border-amber-300 text-amber-900 shadow-xs">
            <Cloud className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="font-semibold text-amber-800">AWS Mode (ap-south-1 • DynamoDB)</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Alex Vance</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Administrator
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase">
              AV
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Tab Views */}
      <div className="flex flex-1">
        {/* Authentic Dark Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              SOC Command Center
            </div>

            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null, badgeColor: '' },
              { id: 'events', label: 'Security Events', icon: Activity, badge: 'DynamoDB', badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30' },
              { id: 'incidents', label: 'Incident Management', icon: AlertTriangle, badge: '2 Open', badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
              { id: 'alerts', label: 'Alerts & Notifications', icon: Bell, badge: 'SNS Live', badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
              { id: 'system', label: 'AWS Monitoring', icon: Server, badge: 'CloudWatch', badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
              { id: 'reports', label: 'Reports & Audit Logs', icon: FileText, badge: 'S3 / Trail', badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
              { id: 'users', label: 'User Management', icon: Users, badge: 'IAM RBAC', badgeColor: 'bg-slate-700 text-slate-300 border border-slate-600' },
              { id: 'settings', label: 'Settings', icon: Settings, badge: null, badgeColor: '' },
              { id: 'simulator', label: 'Detection Testbed', icon: Zap, badge: '6 Vectors', badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-800 text-slate-400 text-[11px] font-mono">
            <div>CloudShield Console v1.0</div>
            <div className="text-slate-500 mt-0.5">Session: Secure TLS 1.3</div>
          </div>
        </aside>

        {/* Main Content Body */}
        <main className="flex-1 overflow-x-hidden p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Enterprise Cloud Security Overview</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Real-time telemetry, threat correlation engine, and automated incident response status.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    Export Audit CSV
                  </button>
                  <button
                    onClick={() => handleTabChange('settings')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition"
                  >
                    <Lock className="w-3.5 h-3.5 text-sky-600" />
                    IAM Configuration
                  </button>
                </div>
              </div>

              {/* 4 KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => handleTabChange('events')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-sky-300 transition"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    <span>Total Events</span>
                    <Activity className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">1,482</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    +14.2% from last monitoring window
                  </div>
                </div>

                <div
                  onClick={() => handleTabChange('events')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    <span>Detected Threats</span>
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">18</div>
                  <div className="text-[11px] text-amber-600 font-medium mt-1">
                    Correlated via Slotted Windows
                  </div>
                </div>

                <div
                  onClick={() => handleTabChange('incidents')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 transition"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    <span>Open Incidents</span>
                    <Flame className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-bold text-rose-600 font-mono">2 Active</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    SQS Dead-Letter Queue: Clean
                  </div>
                </div>

                <div
                  onClick={() => handleTabChange('system')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    <span>Cloud Storage</span>
                    <Database className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">Amazon DynamoDB</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    AWS Cloud-Native Mode
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-800">Telemetry Volume &amp; Attack Frequency</h3>
                    <span className="text-xs text-slate-500">Last 7 Hours</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telemetryTimeSeries}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="events_count" name="Security Events" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2} />
                        <Area type="monotone" dataKey="threats_count" name="Threat Spikes" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Severity Partition */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-800">Risk Severity Partition</h3>
                    <span className="text-xs text-slate-500 font-mono">MITRE Quantized</span>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={severityDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {severityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {severityDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Events Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-600" />
                    <h3 className="font-bold text-sm text-slate-800">Recent Ingested Security Events</h3>
                  </div>
                  <button
                    onClick={() => handleTabChange('events')}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    View All Events →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Event ID</th>
                        <th className="py-2.5 px-4">User</th>
                        <th className="py-2.5 px-4">Source IP</th>
                        <th className="py-2.5 px-4">Event Type</th>
                        <th className="py-2.5 px-4">Resource</th>
                        <th className="py-2.5 px-4 text-center">Score</th>
                        <th className="py-2.5 px-4">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {securityEvents.map((evt) => (
                        <tr
                          key={evt.id}
                          onClick={() => recordSilentTelemetry('inspect_event', `/events/${evt.id}`, `EVENT_ROW_INSPECTED_${evt.id}`)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{evt.id}</td>
                          <td className="py-3 px-4 text-slate-700">{evt.user}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{evt.ip}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{evt.type}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{evt.resource}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold">{evt.score}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evt.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                              evt.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                              'bg-sky-100 text-sky-800'
                            }`}>
                              {evt.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY EVENTS */}
          {currentTab === 'events' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Security Events Ingestion Pipeline</h2>
                  <p className="text-xs text-slate-500">Audit stream partitioned across Amazon DynamoDB storage tables.</p>
                </div>
                <button
                  onClick={handleDownloadReport}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Events
                </button>
              </div>

              <div className="space-y-3">
                {securityEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      recordSilentTelemetry('inspect_event', `/events/${evt.id}`, `EVENT_PAYLOAD_INSPECTED_${evt.id}`);
                      setSelectedEventPayload(evt);
                    }}
                    className="p-4 rounded-lg border border-slate-200 hover:border-sky-300 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{evt.id}</span>
                        <span className="font-semibold text-xs text-slate-800">{evt.type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-200 text-slate-700">
                          {evt.severity}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        User: <strong className="text-slate-700">{evt.user}</strong> • IP: <span className="font-mono">{evt.ip}</span> • Target: <span className="font-mono">{evt.resource}</span>
                      </div>
                    </div>

                    <button className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 rounded border border-sky-200 hover:bg-sky-100 transition shrink-0">
                      View Payload
                    </button>
                  </div>
                ))}
              </div>

              {selectedEventPayload && (
                <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span>Event Payload: {selectedEventPayload.id}</span>
                    <button onClick={() => setSelectedEventPayload(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <pre className="text-[11px] overflow-x-auto text-sky-300">
                    {JSON.stringify({
                      event_id: selectedEventPayload.id,
                      timestamp: new Date().toISOString(),
                      actor: selectedEventPayload.user,
                      source_ip: selectedEventPayload.ip,
                      action: selectedEventPayload.type,
                      target_resource: selectedEventPayload.resource,
                      risk_score: selectedEventPayload.score,
                      security_tier: selectedEventPayload.severity,
                      correlation_status: "VERIFIED_AWS_CLOUDTRAIL"
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INCIDENT MANAGEMENT */}
          {currentTab === 'incidents' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Incident Triage &amp; Containment</h2>
                  <p className="text-xs text-slate-500">Automated SOAR playbooks, state-machine lifecycles, and analyst notes.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-xs font-bold">
                  2 Incidents Requiring Action
                </span>
              </div>

              <div className="space-y-3">
                {securityIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => recordSilentTelemetry('investigate_incident', `/incidents/${inc.id}`, `INCIDENT_TICKET_INVESTIGATED_${inc.id}`)}
                    className="p-4 rounded-lg border border-slate-200 hover:border-rose-300 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{inc.id}</span>
                        <span className="font-bold text-xs text-rose-700">{inc.type}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800">
                          {inc.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Affected User: <strong>{inc.user}</strong> • Risk Score: <strong className="text-rose-600">{inc.score}/100</strong> • {inc.time}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          recordSilentTelemetry('execute_playbook', `/incidents/${inc.id}/playbook`, `PLAYBOOK_EXECUTED_${inc.id}`);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                      >
                        Execute Playbook
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ALERTS & NOTIFICATIONS */}
          {currentTab === 'alerts' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Amazon SNS Alerts &amp; Incident Notifications</h2>
                  <p className="text-xs text-slate-500">Live publish-subscribe notification pipeline for security engineers.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs font-semibold">
                  3 Active Subscriptions
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-slate-800">SNS Alert Topic ARN:</div>
                <div className="font-mono bg-white p-2.5 border border-slate-300 rounded text-slate-700">
                  arn:aws:sns:ap-south-1:123456789012:cloudshield-security-alerts
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">Dispatched Notification Log</h3>
                {alertsList.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => recordSilentTelemetry('inspect_alert', `/alerts/${alt.id}`, `ALERT_PAYLOAD_VIEWED_${alt.id}`)}
                    className="p-4 rounded-lg border border-slate-200 hover:border-sky-300 bg-slate-50/50 cursor-pointer transition flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{alt.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          alt.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                          alt.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {alt.severity}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{alt.time}</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1 font-medium">{alt.message}</div>
                    </div>
                    <span className="text-xs text-sky-600 font-semibold shrink-0">Details →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AWS MONITORING & CLOUD INFRASTRUCTURE */}
          {currentTab === 'system' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">AWS Infrastructure Health (ap-south-1)</h2>
                  <p className="text-xs text-slate-500">Active serverless pipeline components and live CloudWatch telemetry.</p>
                </div>
                <button
                  onClick={handleQueryDatabase}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-500 transition flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  Test Aurora Connection
                </button>
              </div>

              {dbQueryActive && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 space-y-1">
                  <div className="font-bold text-emerald-700">✓ Connection established to aurora-cluster-primary (12ms)</div>
                  <div className="text-slate-600">Active schema: customer_vault_partitions • 24 connections pooled</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Amazon DynamoDB', status: 'Healthy', role: 'Security Events & Incidents Table' },
                  { name: 'Amazon EventBridge', status: 'Healthy', role: 'cloudshield-event-bus (Sub-second routing)' },
                  { name: 'AWS Lambda Workflows', status: 'Healthy', role: 'Threat Detection Evaluator' },
                  { name: 'Amazon SQS Queue', status: 'Healthy', role: 'Dead-Letter & Alert Pipeline' },
                  { name: 'Amazon SNS Alerts', status: 'Healthy', role: 'Incident Notification Topic' },
                  { name: 'Amazon S3 Bucket', status: 'Healthy', role: 'Audit Logs & Compliance Exports' }
                ].map((svc) => (
                  <div
                    key={svc.name}
                    onClick={() => recordSilentTelemetry('inspect_aws_service', `/system/aws/${svc.name.replace(/\s+/g, '-').toLowerCase()}`, `AWS_METRICS_QUERY_${svc.name.replace(/\s+/g, '_')}`)}
                    className="p-4 rounded-lg border border-slate-200 hover:border-sky-300 transition cursor-pointer bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{svc.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {svc.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{svc.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: REPORTS & AUDIT LOGS */}
          {currentTab === 'reports' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Security Reports &amp; Compliance Audits</h2>
                  <p className="text-xs text-slate-500">Automated ISO 27001 &amp; SOC2 compliance report exports.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-slate-900">CloudShield Comprehensive Security Audit (Q4-2026)</div>
                  <div className="text-[11px] text-slate-500">Generated automatically via AWS S3 storage pipeline.</div>
                </div>
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  Download Full CSV Audit Log
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: USER MANAGEMENT */}
          {currentTab === 'users' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">IAM &amp; RBAC Access Governance</h2>
                  <p className="text-xs text-slate-500">Directory identities, assigned security roles, and active multi-factor authentication.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">MFA Status</th>
                      <th className="py-2.5 px-4">Last Activity</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userDirectory.map((u) => (
                      <tr
                        key={u.email}
                        onClick={() => recordSilentTelemetry('inspect_user', `/users/${u.email}`, `USER_ROW_INSPECTED_${u.email}`)}
                        className="hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{u.role}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Enforced (TOTP)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{u.lastLogin}</td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-sky-600 font-semibold hover:underline">
                            Edit Privileges
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: SETTINGS & IAM ACCESS */}
          {currentTab === 'settings' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Security Configuration &amp; IAM Access Keys</h2>
                  <p className="text-xs text-slate-500">Master cloud credentials, API integrations, and notification preferences.</p>
                </div>
              </div>

              {/* Masked Credentials Notice Alert */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-4 text-xs text-sky-900">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-5 h-5 text-sky-600 shrink-0" />
                  <div>
                    <div className="font-bold">Credential Obfuscation Active</div>
                    <div className="text-[11px] text-sky-700 mt-0.5">
                      In accordance with Cloud Security Compliance standards, all API keys, webhook secrets, and private signing keys are masked.
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-mono text-[10px] font-bold">
                  Zero-Leak Enforced
                </span>
              </div>

              {/* Master AWS Access Token Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">Master CloudShield IAM Access Token:</div>
                <div className="p-3 bg-white border border-slate-300 rounded font-mono text-xs text-slate-800 flex items-center justify-between">
                  <span className="font-bold">AKIA2V4XN7L9Q0192837</span>
                  <button
                    onClick={handleInspectIamKey}
                    className="text-xs text-sky-600 font-bold hover:underline flex items-center gap-1"
                  >
                    {showSecretKey ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide Secret Key
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Reveal Secret Key
                      </>
                    )}
                  </button>
                </div>

                {showSecretKey && (
                  <div className="p-3 bg-white border border-slate-300 rounded font-mono text-xs text-slate-800 flex items-center justify-between">
                    <span className="text-slate-600">Secret: <strong className="text-slate-900">wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</strong></span>
                    <span className="text-[10px] text-slate-500">AWS SigV4 Authorized</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-500">
                  Used by CloudShield ingestion lambdas to query AWS CloudWatch and DynamoDB.
                </div>
              </div>

              {/* CanIPhish Configuration (Masked) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">CanIPhish API &amp; Webhook Credentials:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 block text-[11px] mb-0.5 font-semibold">API Base URL</label>
                    <div className="p-2 bg-white border border-slate-300 rounded font-mono text-slate-800">
                      https://api.caniphish.com/api/v3
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[11px] mb-0.5 font-semibold">API Key (Masked)</label>
                    <div className="p-2 bg-white border border-slate-300 rounded font-mono text-slate-600 flex items-center justify-between">
                      <span>••••••••••••••••••••••••••••••••</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">Secured</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: DETECTION TESTBED (SIMULATOR) */}
          {currentTab === 'simulator' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Threat Simulation &amp; Detection Validation Testbed</h2>
                  <p className="text-xs text-slate-500">Inject synthetic attack vectors to validate detection rules and SOAR response times.</p>
                </div>
              </div>

              {simulatorStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{simulatorStatus}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Brute Force Authentication Burst', desc: 'Simulates 20 rapid failed login attempts from distinct IPs.' },
                  { name: 'Impossible Travel Velocity', desc: 'Simulates successive logins from Tokyo and London within 5 minutes.' },
                  { name: 'Privileged Resource Exfiltration', desc: 'Simulates bulk GET requests on S3 production vaults.' },
                  { name: 'IAM Privilege Escalation', desc: 'Simulates an unauthorized AttachUserPolicy API invocation.' },
                ].map((sc) => (
                  <div key={sc.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{sc.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{sc.desc}</div>
                    </div>
                    <button
                      onClick={() => handleRunSimulatorScenario(sc.name)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run Test Scenario
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
