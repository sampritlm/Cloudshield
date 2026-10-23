import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Cloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  FolderArchive,
  BarChart2,
  ScrollText,
  Server,
  Layers,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { ReportSummary } from '../types';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'cloudtrail'>('reports');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CloudTrail state
  const [cloudTrailLogs, setCloudTrailLogs] = useState<any[]>([]);
  const [isLoadingTrail, setIsLoadingTrail] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const loadReport = async (silent: boolean = false) => {
    if (!silent) setIsGenerating(true);
    try {
      const data = await api.getLatestReport();
      setReport(data);
      setLastSyncTime(new Date());
    } catch (err: any) {
      if (!silent) setErrorMsg(err.message || 'Report fetch failed');
    } finally {
      if (!silent) setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const data = await api.generateReport('CloudShield Comprehensive Security Audit Report');
      setReport(data);
      setLastSyncTime(new Date());
    } catch (err: any) {
      setErrorMsg(err.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const fetchCloudTrail = async (silent: boolean = false) => {
    if (!silent) setIsLoadingTrail(true);
    try {
      const logs = await api.getCloudTrailLogs();
      setCloudTrailLogs(logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoadingTrail(false);
    }
  };

  useEffect(() => {
    loadReport(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'cloudtrail') {
      fetchCloudTrail(false);
    }
  }, [activeTab]);

  // Real-time synchronization interval
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      if (activeTab === 'reports') {
        loadReport(true);
      } else if (activeTab === 'cloudtrail') {
        fetchCloudTrail(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isLiveActive, activeTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0">
      {/* Top action bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Audit Logs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Amazon S3 security compliance documentation archives & AWS CloudTrail governance activity auditing
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Real-time streaming status pill */}
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isLiveActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs hover:bg-emerald-100'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
            }`}
            title={isLiveActive ? "Auto-syncing every 3s with active telemetry and S3" : "Click to resume live sync"}
          >
            <span className="relative flex h-2 w-2">
              {isLiveActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
            <span className="font-mono tracking-tight">{isLiveActive ? 'REAL-TIME (3s)' : 'PAUSED'}</span>
          </button>

          {/* Sub tabs */}
          <div className="flex p-1 bg-slate-100 rounded-lg text-xs font-semibold mr-1">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reports & S3 Archives
            </button>
            <button
              onClick={() => setActiveTab('cloudtrail')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'cloudtrail' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AWS CloudTrail Logs
            </button>
          </div>

          {activeTab === 'reports' && (
            <>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={!report}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm disabled:opacity-40 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Compiling...' : 'Generate New S3 Report'}</span>
              </button>
            </>
          )}

          {activeTab === 'cloudtrail' && (
            <button
              onClick={() => fetchCloudTrail(false)}
              disabled={isLoadingTrail}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTrail ? 'animate-spin' : ''}`} />
              <span>Sync CloudTrail</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 print:hidden">
          {errorMsg}
        </div>
      )}

      {/* View 1: Reports & S3 Archives */}
      {activeTab === 'reports' && (
        <>
          {report ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6 print:border-none print:shadow-none print:p-0">
              {/* Header */}
              <div className="border-b border-slate-200 pb-5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">
                      Amazon S3 Compliance Store
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {report.report_id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    Cloud Security Posture & Threat Detection Audit
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(report.generated_at).toUTCString()}
                    </span>
                    <span>Auditor: {report.generated_by}</span>
                  </div>
                </div>

                {/* S3 Archival Badge */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <Cloud className="w-6 h-6 text-sky-600 shrink-0" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-800">
                      {report.stored_in_s3 ? 'Persisted in Amazon S3' : 'Local Archive Ready'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                      {report.s3_key || 'reports_storage/audit.csv'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Total Events Evaluated</div>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{report.total_events}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Open Triage Incidents</div>
                  <div className="text-2xl font-bold font-mono text-rose-600 mt-1">{report.open_incidents_count}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Resolved Threats</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{report.resolved_incidents_count}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Average Risk Score</div>
                  <div className="text-2xl font-bold font-mono text-slate-800 mt-1">{report.risk_score_stats.average}</div>
                </div>
              </div>

              {/* Severity Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Severity Distribution</h3>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {Object.entries(report.severity_distribution).map(([sev, cnt]) => (
                    <div key={sev} className="p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="font-semibold text-slate-600">{sev}</div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{cnt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Security Report Compiled Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click <strong>"Generate New S3 Report"</strong> to aggregate active telemetry and archive compliance records to Amazon S3.
              </p>
            </div>
          )}
        </>
      )}

      {/* View 2: AWS CloudTrail Activity Auditing */}
      {activeTab === 'cloudtrail' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">AWS CloudTrail Governance Audit Trail</h2>
            </div>
            <span className="text-xs text-slate-500">
              Tracking management and data events across EventBridge, Lambda, DynamoDB, SQS, SNS, and S3
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Event ID / Time</th>
                  <th className="py-3 px-4">AWS Service</th>
                  <th className="py-3 px-4">Event Name</th>
                  <th className="py-3 px-4">IAM User / Role Identity</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {cloudTrailLogs.map((log) => (
                  <tr key={log.event_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.event_id}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {new Date(log.event_time).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800">
                      {log.aws_service}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {log.event_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      <div className="truncate max-w-[180px]">{log.user_identity?.principal_id}</div>
                      <div className="text-[10px] text-slate-400">{log.source_ip_address}</div>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-500 truncate max-w-[180px]">
                      {log.resources?.[0]?.arn || log.resources?.[0]?.type}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {log.response_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px]">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
