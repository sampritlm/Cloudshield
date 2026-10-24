import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Lock,
  Globe,
  KeyRound,
  Mail,
  ExternalLink,
  Eye,
  ShieldCheck,
  Info,
  Clock,
  Sparkles,
  Server,
  Layers,
  Check,
  Shield,
  FolderLock,
  FileCheck,
  Ban,
  ArrowRight,
  Radio,
  Send,
  Flame,
  Fish,
  Crosshair,
  BadgeAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export interface SecurityRuleItem {
  rule_code: string;
  rule_name: string;
  penalty: string;
  points: number;
  sliding_window: string;
  evaluation_condition: string;
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  icon: string;
}

export interface CorporateResource {
  id: string;
  name: string;
  path: string;
  category: string;
  description: string;
  restricted: boolean;
  required_role: string;
}

interface Props {
  onNavigateToAdminIncidents?: () => void;
  onNavigateToAdminEvents?: () => void;
}

export const UserRuleSandbox: React.FC<Props> = ({
  onNavigateToAdminIncidents,
  onNavigateToAdminEvents
}) => {
  const { user, isAdmin } = useAuth();
  const [rules, setRules] = useState<SecurityRuleItem[]>([]);
  const [resources, setResources] = useState<CorporateResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'INFRA' | 'CANIPHISH'>('ALL');
  
  // Execution state
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [lastIncidentResult, setLastIncidentResult] = useState<any | null>(null);
  const [customIp, setCustomIp] = useState<string>('192.168.1.100');
  const [customUser, setCustomUser] = useState<string>(user?.email || 'user@cloudshield.internal');

  // Resource access test state
  const [accessingPath, setAccessingPath] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rulesData, resourcesData] = await Promise.all([
        api.getUserRulesCatalog(),
        api.getCorporateResources().catch(() => [])
      ]);
      setRules(rulesData || []);
      setResources(resourcesData || []);
    } catch (err) {
      console.error('Failed to load detector data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (actionId: string, ruleCode: string, customParams?: any) => {
    setExecutingActionId(actionId);
    setLastIncidentResult(null);
    try {
      let res: any;
      if (actionId.startsWith('resource-')) {
        res = await api.accessCorporateResource(customParams?.path, customIp.trim() || undefined);
      } else {
        res = await api.testDetectionRule({
          rule_code: ruleCode,
          custom_ip: customIp.trim() || undefined,
          custom_user: customUser.trim() || undefined
        });
      }
      setLastIncidentResult({
        ...res,
        action_id: actionId,
        triggered_at: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      console.error('Action execution failed:', err);
      alert(`Action failed: ${err.message}`);
    } finally {
      setExecutingActionId(null);
    }
  };

  const threatActions = [
    // 1. INFRASTRUCTURE RULE BREAKS
    {
      id: 'infra-iam',
      category: 'INFRA',
      ruleCode: 'RULE_03',
      title: 'Access Restricted AWS Cloud IAM Root Keys',
      description: 'Attempts an unauthorized HTTP read targeting /api/v1/iam/credentials to extract root access credentials.',
      endpoint: '/api/v1/iam/credentials',
      penalty: '+45 pts',
      severity: 'HIGH' as const,
      icon: Lock,
      iconColor: 'text-rose-600',
      bgColor: 'border-rose-200 bg-rose-50/40',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
      badge: 'RULE_03 Violation'
    },
    {
      id: 'infra-secrets',
      category: 'INFRA',
      ruleCode: 'RULE_03',
      title: 'Harvest HashiCorp Vault Secrets & DB Passwords',
      description: 'Attempts an unauthorized read of production database master credentials from /admin/secrets.',
      endpoint: '/admin/secrets',
      penalty: '+45 pts',
      severity: 'HIGH' as const,
      icon: FolderLock,
      iconColor: 'text-orange-600',
      bgColor: 'border-orange-200 bg-orange-50/40',
      btnColor: 'bg-orange-600 hover:bg-orange-700',
      badge: 'RULE_03 Violation'
    },
    {
      id: 'infra-burst',
      category: 'INFRA',
      ruleCode: 'RULE_04',
      title: 'Trigger API Request Burst Flood (Spike)',
      description: 'Dispatches a high-frequency burst spike of 25 API requests within 5 seconds to bypass API rate limits.',
      endpoint: '/api/v1/query/telemetry (25 reqs/5s)',
      penalty: '+35 pts',
      severity: 'HIGH' as const,
      icon: Zap,
      iconColor: 'text-indigo-600',
      bgColor: 'border-indigo-200 bg-indigo-50/40',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700',
      badge: 'RULE_04 Burst Spike'
    },
    {
      id: 'infra-ip',
      category: 'INFRA',
      ruleCode: 'RULE_02',
      title: 'Establish Session from Untrusted Foreign IP',
      description: 'Sends authentication and dashboard traffic originating from an unauthorized public external IP (203.0.113.89).',
      endpoint: 'Origin: 203.0.113.89 (Untrusted ASN)',
      penalty: '+25 pts',
      severity: 'MEDIUM' as const,
      icon: Globe,
      iconColor: 'text-sky-600',
      bgColor: 'border-sky-200 bg-sky-50/40',
      btnColor: 'bg-sky-600 hover:bg-sky-700',
      badge: 'RULE_02 Perimeter Breach'
    },
    {
      id: 'infra-multi',
      category: 'INFRA',
      ruleCode: 'RULE_05',
      title: 'Execute Compound Multi-Vector Cyber Attack',
      description: 'Simultaneously combines an untrusted external IP perimeter breach with restricted secret harvesting and request burst.',
      endpoint: 'Compound Vector: IP + Token + Secret',
      penalty: '+20 pts bonus (90 pts total)',
      severity: 'CRITICAL' as const,
      icon: Flame,
      iconColor: 'text-purple-600',
      bgColor: 'border-purple-200 bg-purple-50/40',
      btnColor: 'bg-purple-600 hover:bg-purple-700',
      badge: 'RULE_05 Multi-Vector'
    },

    // 2. PHISHING VECTORS (CANIPHISH)
    {
      id: 'phish-link',
      category: 'CANIPHISH',
      ruleCode: 'CANIPH_02',
      title: 'Click Deceptive Phishing Payload Link',
      description: 'Simulates employee clicking a malicious URL inside a spoofed Google/Microsoft notification email.',
      endpoint: 'URI: accounts.google.alerting-services.com',
      penalty: '+35 pts',
      severity: 'HIGH' as const,
      icon: ExternalLink,
      iconColor: 'text-amber-600',
      bgColor: 'border-amber-200 bg-amber-50/40',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      badge: 'CANIPH_02 Payload Clicked'
    },
    {
      id: 'phish-landing',
      category: 'CANIPHISH',
      ruleCode: 'CANIPH_03',
      title: 'Visit Spoofed Credential Harvesting Website',
      description: 'Employee navigates to a deceptive lookalike portal designed to harvest enterprise corporate SSO passwords.',
      endpoint: 'Portal: https://identity.alerting-services.com/login',
      penalty: '+35 pts',
      severity: 'HIGH' as const,
      icon: Eye,
      iconColor: 'text-purple-600',
      bgColor: 'border-purple-200 bg-purple-50/40',
      btnColor: 'bg-purple-600 hover:bg-purple-700',
      badge: 'CANIPH_03 Site Visited'
    },
    {
      id: 'phish-compromise',
      category: 'CANIPHISH',
      ruleCode: 'CANIPH_04',
      title: 'Submit Corporate Password on Fake Portal (Compromise)',
      description: 'Employee enters and submits Active Directory / Google credentials into the attacker phishing form.',
      endpoint: 'Compromise: Credentials Harvested',
      penalty: '+70 pts',
      severity: 'CRITICAL' as const,
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'border-red-300 bg-red-50/50',
      btnColor: 'bg-red-700 hover:bg-red-800',
      badge: 'CANIPH_04 Employee Compromised'
    },
    {
      id: 'phish-report',
      category: 'CANIPHISH',
      ruleCode: 'CANIPH_05',
      title: 'Proactively Report Suspicious Phishing Email to SOC',
      description: 'Employee identifies the deceptive lure and clicks the CloudShield "Report Phish" button in their mailbox.',
      endpoint: 'SOC Triage: Phishing Flagged',
      penalty: '-10 pts (Hygiene Bonus)',
      severity: 'LOW' as const,
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      bgColor: 'border-emerald-200 bg-emerald-50/40',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      badge: 'CANIPH_05 Proactive Defense'
    }
  ];

  const filteredThreatActions = threatActions.filter((a) => {
    if (activeCategory === 'INFRA') return a.category === 'INFRA';
    if (activeCategory === 'CANIPHISH') return a.category === 'CANIPHISH';
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'LOW':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold font-mono">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Threat Detection &bull; Rule Breaks &amp; Phishing Interception</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Threat Detector &amp; Protected Assets Center
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Trigger any rule break or phishing threat action below. The <strong>CloudShield Detector</strong> intercepts the violation in real time (&le; 5 ms), assigns penalty points, generates a real <strong>SOC Incident Ticket</strong>, and dispatches it directly to the <strong>Admin Portal</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-amber-400 font-mono">10 Rules</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Active Evaluator</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-emerald-400 font-mono">&le; 5 ms</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Detector Latency</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION A: DETECTOR INTERCEPTION & DISPATCH TO ADMIN BANNER */}
      {lastIncidentResult && (
        <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                  lastIncidentResult.severity === 'CRITICAL'
                    ? 'bg-rose-700 animate-pulse'
                    : lastIncidentResult.severity === 'HIGH'
                    ? 'bg-rose-600'
                    : 'bg-emerald-600'
                }`}
              >
                {lastIncidentResult.incident_created ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {lastIncidentResult.status || 'THREAT_INTERCEPTED'}
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    {lastIncidentResult.rule_code} &bull; {lastIncidentResult.rule_name}
                  </span>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      lastIncidentResult.severity
                    )}`}
                  >
                    {lastIncidentResult.severity}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {lastIncidentResult.message || `Threat detected under ${lastIncidentResult.rule_code}`}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Target Identity: <span className="font-mono text-slate-700 font-semibold">{lastIncidentResult.test_user}</span> &bull; Detected At: <span className="font-mono text-slate-700">{lastIncidentResult.triggered_at}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Detector Penalty Score</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {lastIncidentResult.risk_score}{' '}
                  <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
              </div>

              {lastIncidentResult.incident_created ? (
                <div className="px-4 py-3 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-xl text-xs shadow-sm">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Incident Dispatched to Admin Console</span>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-rose-950 mt-1">
                    {lastIncidentResult.incident_id}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div>Logged Clean</div>
                    <div className="text-[10px] text-slate-500">&le; 30 pts (Benign)</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details & Admin Link */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 col-span-2 border border-slate-200">
              <span className="font-bold text-slate-800">Detector Decision &amp; Interception Reasons:</span>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                {lastIncidentResult.detection_reasons?.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex flex-col justify-between space-y-2">
              <div>
                <span className="font-bold text-indigo-900 block">SOC Dispatch Pipeline:</span>
                <div className="text-[11px] text-indigo-800 font-mono mt-1 space-y-0.5">
                  <div>&bull; Event: {lastIncidentResult.event_id}</div>
                  <div>&bull; Queue: Amazon SQS (High Priority)</div>
                  <div>&bull; Storage: DynamoDB &bull; Status: OPEN</div>
                </div>
              </div>

              {onNavigateToAdminIncidents && lastIncidentResult.incident_created && (
                <button
                  onClick={onNavigateToAdminIncidents}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>👉 View in Admin Incident Management</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SECTION B: INTERACTIVE THREAT ACTIONS (RULE BREAKS & PHISHING) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Trigger Threat Violations &amp; Penalties (Rule Breaks &amp; Phishing Traps)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select an action to trigger a real penalty violation. CloudShield will detect the event, calculate risk, and push an incident into the Admin SOC Console.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Actions (9)
            </button>
            <button
              onClick={() => setActiveCategory('INFRA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeCategory === 'INFRA'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Rule Breaks (5)
            </button>
            <button
              onClick={() => setActiveCategory('CANIPHISH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeCategory === 'CANIPHISH'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Fish className="w-3.5 h-3.5" />
              Phishing Traps (4)
            </button>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredThreatActions.map((action) => {
            const Icon = action.icon;
            const isExecuting = executingActionId === action.id;
            return (
              <div
                key={action.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 hover:shadow-md ${action.bgColor}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        action.severity
                      )}`}
                    >
                      {action.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {action.penalty}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 mt-2.5">
                    <div className="p-2 rounded-lg bg-white shadow-xs border shrink-0">
                      <Icon className={`w-4 h-4 ${action.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {action.title}
                      </h3>
                      <code className="text-[10px] font-mono text-slate-600 block mt-1 break-all bg-white/80 px-1 py-0.5 rounded border border-slate-200/60">
                        {action.endpoint}
                      </code>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => handleExecuteAction(action.id, action.ruleCode)}
                    disabled={isExecuting}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm ${action.btnColor} disabled:opacity-50`}
                  >
                    {isExecuting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Detector Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Execute &amp; Send to Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SECTION C: Table I Security Heuristics Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Table I: Rule Catalog &amp; Scoring Invariants
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            All 10 rules enforced across infrastructure and phishing vectors
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 uppercase font-mono text-[11px]">
                <th className="py-3 px-4 font-bold">Rule Code</th>
                <th className="py-3 px-4 font-bold">Rule Name &amp; Heuristic</th>
                <th className="py-3 px-4 font-bold text-center">Score Delta</th>
                <th className="py-3 px-4 font-bold">Window</th>
                <th className="py-3 px-4 font-bold">Evaluation Invariant Condition</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {rules.map((rule) => {
                const isExecuting = executingActionId === `table-${rule.rule_code}`;
                return (
                  <tr
                    key={rule.rule_code}
                    className="hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {rule.rule_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rule.rule_name}</div>
                      <div className="text-[11px] text-slate-500">{rule.description}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                          rule.points > 40
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : rule.points > 20
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : rule.points < 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {rule.penalty}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {rule.sliding_window}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-800 border border-slate-200">
                        {rule.evaluation_condition}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleExecuteAction(`table-${rule.rule_code}`, rule.rule_code)}
                        disabled={isExecuting}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all disabled:opacity-50"
                      >
                        {isExecuting ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Radio className="w-3 h-3" />
                        )}
                        <span>Test Rule</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Enterprise Resources Explorer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Corporate Resources (Allowed vs Restricted)</h3>
            <p className="text-xs text-slate-500">Allowed resources return 200 OK. Restricted resources trigger RULE_03 (+45 pts) and send an incident ticket to the SOC.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {resources.map((res) => {
            const isAccessing = executingActionId === `res-${res.id}`;
            return (
              <div
                key={res.id}
                className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 text-xs ${
                  res.restricted ? 'bg-rose-50/30 border-rose-200' : 'bg-emerald-50/30 border-emerald-200'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    res.restricted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {res.restricted ? 'Restricted' : 'Authorized'}
                  </span>
                  <div className="font-bold text-slate-900 mt-1">{res.name}</div>
                  <code className="text-[10px] font-mono text-slate-600 block truncate">{res.path}</code>
                </div>

                <button
                  onClick={() => handleExecuteAction(`res-${res.id}`, 'RULE_03', { path: res.path })}
                  disabled={isAccessing}
                  className={`py-1 px-2.5 rounded-lg font-semibold text-white text-[11px] flex items-center justify-center gap-1 ${
                    res.restricted ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isAccessing ? 'Accessing...' : res.restricted ? 'Access (Intercept)' : 'Access (Allowed)'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
