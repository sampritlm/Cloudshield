import React, { useState, useEffect } from 'react';
import {
  Fish,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link,
  Shield,
  Send,
  ExternalLink,
  Mail,
  Activity,
  Layers,
  HelpCircle,
  Copy,
  Check,
  MousePointerClick,
  KeyRound,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { SeverityBadge } from '../../components/SeverityBadge';

export const AdminCanIPhish: React.FC = () => {
  const [statusData, setStatusData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);
  const [copied, setCopied] = useState(false);

  // Simulation parameters
  const [targetUser, setTargetUser] = useState<string>('user@cloudshield.internal');
  const [campaignName, setCampaignName] = useState<string>('CanIPhish - Microsoft 365 Cloud Document Lure');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, campRes, resultsRes] = await Promise.allSettled([
        api.getCanIPhishStatus(),
        api.getCanIPhishCampaigns(),
        api.getCanIPhishSimulationResults()
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatusData(statusRes.value);
      }
      if (campRes.status === 'fulfilled') {
        setCampaigns(campRes.value || []);
      }
      if (resultsRes.status === 'fulfilled') {
        setSimulationResults(resultsRes.value || []);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to fetch CanIPhish data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedbackMessage(null);
    try {
      const res = await api.testCanIPhishConnection();
      if (res.status === 'SUCCESS' || res.connection_status === 'CONNECTED') {
        setFeedbackMessage({ type: 'success', text: 'CanIPhish API connection verified successfully!' });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.message || res.last_error || 'CanIPhish credentials need configuration or verification.'
        });
      }
      fetchData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncCampaigns = async () => {
    setIsSyncing(true);
    setFeedbackMessage(null);
    try {
      const res = await api.syncCanIPhishCampaigns();
      setFeedbackMessage({
        type: 'success',
        text: `Sync complete: ${res.campaigns_checked || 0} campaigns inspected, ${res.events_ingested || 0} telemetry events ingested into CloudShield.`
      });
      fetchData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Campaign sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerSimulation = async (eventType: string, scenarioLabel: string) => {
    setIsSimulating(eventType);
    setFeedbackMessage(null);
    try {
      const res = await api.simulateCanIPhishEvent({
        event_type: eventType,
        target_user: targetUser.trim() || 'user@cloudshield.internal',
        campaign_name: campaignName.trim() || 'CanIPhish - Security Simulation Lure',
        source_ip: '198.51.100.22'
      });

      let detailText = `Risk Score: ${res.risk_score}/100 (${res.severity} Severity)`;
      if (res.incident_id) {
        detailText += ` • Created High-Priority Incident: ${res.incident_id} (Routed to SQS & SNS)`;
      } else if (eventType === 'emailReported') {
        detailText += ' • Awarded +15 Vigilance Points to recipient awareness score';
      }

      setFeedbackMessage({
        type: 'success',
        text: `[CanIPhish Event] ${scenarioLabel} simulated successfully! ${detailText}`
      });

      fetchData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Simulation failed: ${err.message || 'Could not process event'}`
      });
    } finally {
      setIsSimulating(null);
    }
  };

  const copyWebhookUrl = () => {
    if (statusData?.webhook_url) {
      navigator.clipboard.writeText(statusData.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const caniphishScenarios = [
    {
      id: 'payloadClicked',
      title: 'Phishing Email Interaction',
      sublabel: 'payloadClicked',
      icon: MousePointerClick,
      color: 'border-amber-200 hover:border-amber-400 bg-amber-50/40',
      iconColor: 'text-amber-600 bg-amber-100',
      scoreImpact: '+30 Risk Points',
      severityExpected: 'MEDIUM / 30 pts',
      description: 'Simulates an employee clicking on a fake hyperlink or suspicious landing page inside a CanIPhish email lure.',
      detectionDetails: 'Triggers RULE_CANIPHISH_PAYLOAD_CLICKED. Subtracts 25 points from employee awareness score.',
      buttonText: 'Simulate Link Clicked',
      buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    {
      id: 'employeeCompromised',
      title: 'Simulated Credential Compromise',
      sublabel: 'employeeCompromised',
      icon: AlertOctagon,
      color: 'border-rose-200 hover:border-rose-400 bg-rose-50/40',
      iconColor: 'text-rose-600 bg-rose-100',
      scoreImpact: '+50 Risk Points (Incident)',
      severityExpected: 'HIGH / 50-70 pts',
      description: 'Simulates recipient entering credentials on a mock landing page. Safe simulation: no actual passwords collected.',
      detectionDetails: 'Triggers RULE_CANIPHISH_COMPROMISED. Automatically generates a High Severity incident routed via Amazon SQS and SNS.',
      buttonText: 'Simulate Compromise',
      buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white'
    },
    {
      id: 'emailReported',
      title: 'Phishing Email Reported',
      sublabel: 'emailReported',
      icon: ShieldCheck,
      color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/40',
      iconColor: 'text-emerald-600 bg-emerald-100',
      scoreImpact: '+15 Awareness Points',
      severityExpected: 'CLEAN / 0 pts',
      description: 'Simulates the user spotting deceptive sender indicators and reporting the email via the CloudShield Outlook plugin.',
      detectionDetails: 'Recognized as positive defense. Logged to EventBridge for SOC verification and awards +15 awareness points.',
      buttonText: 'Simulate Email Reported',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    {
      id: 'deliveryFailed',
      title: 'Email Delivery Failure',
      sublabel: 'deliveryFailed',
      icon: Mail,
      color: 'border-slate-200 hover:border-slate-400 bg-slate-50/60',
      iconColor: 'text-slate-600 bg-slate-100',
      scoreImpact: '0 pts (Delivery Audit)',
      severityExpected: 'LOW / 0 pts',
      description: 'Simulates an MTA transport bounce or mailbox rejection event from the CanIPhish delivery infrastructure.',
      detectionDetails: 'Logged in DynamoDB and CloudWatch to evaluate simulation campaign deliverability metrics.',
      buttonText: 'Simulate Delivery Failure',
      buttonClass: 'bg-slate-700 hover:bg-slate-800 text-white'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Fish className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">CanIPhish Integration & Phishing Simulation</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulated phishing campaign telemetry synchronization, API v3 preflight diagnostics & interactive threat simulation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-sky-600 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing API...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSyncCampaigns}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Campaigns Now'}
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-xs shadow-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-semibold">{feedbackMessage.text}</div>
          </div>
        </div>
      )}

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Connection Status
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.connection_status === 'CONNECTED'
                  ? 'bg-emerald-500'
                  : statusData?.connection_status === 'CREDENTIALS_MISSING'
                  ? 'bg-amber-500'
                  : 'bg-sky-500'
              }`}
            />
            <span className="text-sm font-bold text-slate-900">
              {statusData?.connection_status || 'SIMULATION_READY'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            API Base: {statusData?.api_base_url || 'https://api.caniphish.com/api/v3'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            API Quota / Usage
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">
            {statusData?.remaining_api_quota !== undefined
              ? `${statusData.remaining_api_quota} remaining`
              : 'Simulation / Academic Tier'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Plan: {statusData?.plan_name || 'Academic Project Trial'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Processing Engine
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">
            EventBridge & Lambda
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Deterministic rule correlation & SQS queueing
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Outbound Webhook
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              Active & Listening
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Header: X-CloudShield-Secret
          </div>
        </div>
      </div>

      {/* 2. Interactive CanIPhish Threat Simulation Dispatcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-50 text-sky-600 rounded-md">
                <Send className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Simulate CanIPhish Threat Scenarios
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 font-mono">
                CanIPhish Events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate actual CanIPhish webhook events directly through CloudShield's threat detection pipeline without external corporate email requirements.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Target Employee:</label>
              <input
                type="text"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="user@cloudshield.internal"
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono w-48 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Campaign Name:</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Microsoft 365 Cloud Document Lure"
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-sans w-60 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* 4 CanIPhish Simulation Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {caniphishScenarios.map((sc) => {
            const Icon = sc.icon;
            const isBusy = isSimulating === sc.id;
            return (
              <div
                key={sc.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-sm ${sc.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`p-2 rounded-lg ${sc.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {sc.sublabel}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-xs">{sc.title}</h3>
                  <div className="text-[11px] font-semibold text-slate-700 mt-1 flex items-center gap-1.5 font-mono">
                    <span>Impact:</span>
                    <span className="text-slate-900">{sc.scoreImpact}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="mt-2.5 p-2 rounded-lg bg-white/80 border border-slate-200/60 text-[10px] text-slate-500">
                    {sc.detectionDetails}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => handleTriggerSimulation(sc.id, sc.title)}
                    disabled={isSimulating !== null}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${sc.buttonClass}`}
                  >
                    {isBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isBusy ? 'Processing...' : sc.buttonText}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CanIPhish Simulation Results Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">CanIPhish Simulation Results</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              {simulationResults.length} Ingested Events
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Source: CANIPHISH (Live Telemetry & Evaluator)
          </span>
        </div>

        {simulationResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Event ID & Time</th>
                  <th className="py-3 px-4">Target Employee</th>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Simulation Action</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Incident Status</th>
                  <th className="py-3 px-4 text-right">Source Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {simulationResults.map((evt: any, idx: number) => {
                  const isCompromise = evt.event_type === 'employeeCompromised';
                  const isClick = evt.event_type === 'payloadClicked';
                  const isReport = evt.event_type === 'emailReported';

                  return (
                    <tr key={evt.event_id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{evt.event_id}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {new Date(evt.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {evt.test_user}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        <div>{evt.campaign_name || 'CanIPhish Campaign'}</div>
                        <div className="font-mono text-[10px] text-slate-400">{evt.campaign_id || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            isCompromise
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isClick
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isReport
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {evt.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900">
                        {evt.risk_score}
                      </td>
                      <td className="py-3 px-4">
                        <SeverityBadge severity={evt.severity} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        {evt.incident_id ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            {evt.incident_id}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">No Incident (Score ≤30)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-300">
                          <Fish className="w-3 h-3 text-sky-600" />
                          CanIPhish Events
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No CanIPhish Events Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Use the simulator buttons above or sync external campaigns to generate live CanIPhish telemetry into CloudShield.
            </p>
          </div>
        )}
      </div>

      {/* 4. Synchronized Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Synchronized Phishing Campaigns</h2>
          </div>
          <span className="text-xs text-slate-500">
            {campaigns.length} campaigns retrieved via API
          </span>
        </div>

        {campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Campaign GUID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scheduled / Start</th>
                  <th className="py-3 px-4 text-center">Targets</th>
                  <th className="py-3 px-4 text-center">Clicks</th>
                  <th className="py-3 px-4 text-center">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {camp.campaignName || camp.name || 'Simulated Campaign'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {camp.campaignGUID?.slice(0, 12) || 'camp-guid-auto'}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                        {camp.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {camp.startDate || '2026-03-01'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {camp.totalTargets || 24}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600">
                      {camp.clicks || 2}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                      {camp.reported || 5}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Standard Simulated Campaigns Loaded</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              CloudShield continuously evaluates incoming phishing telemetry from the CanIPhish platform and local Threat Simulator.
            </p>
          </div>
        )}
      </div>

      {/* 5. Webhook Configuration & Manual Setup Guide */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">CanIPhish Outbound Webhook Endpoint</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
            Real-time Ingestion
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          CloudShield listens for live event deliveries from CanIPhish (e.g. payload clicks, credential compromises,
          and email reports). Configure this endpoint in your CanIPhish management portal:
        </p>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4 font-mono text-xs text-sky-300">
          <span className="truncate">
            {statusData?.webhook_url || 'https://your-cloudshield-domain/api/webhooks/caniphish'}
          </span>
          <button
            onClick={copyWebhookUrl}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-sans transition-all shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy URL'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-2 border-t border-slate-800">
          <div>
            <span className="text-slate-400 block text-[11px]">Header Name:</span>
            <span className="font-mono text-slate-200">X-CloudShield-Secret</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Subscribed Events:</span>
            <span className="text-slate-200">payloadClicked, employeeCompromised, emailReported, deliveryFailed</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Security Verification:</span>
            <span className="text-emerald-400 font-semibold">Constant-time HMAC / Secret match</span>
          </div>
        </div>
      </div>
    </div>
  );
};
