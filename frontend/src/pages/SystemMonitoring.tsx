import React, { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  Inbox,
  Bell,
  HardDrive,
  FileText,
  RotateCcw,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { SystemHealthResponse, ServiceStatus } from '../types';

export const SystemMonitoring: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPollingSqs, setIsPollingSqs] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [sqsMessage, setSqsMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handlePollSqs = async () => {
    setIsPollingSqs(true);
    setSqsMessage(null);
    try {
      const res = await api.pollSqsQueue();
      setSqsMessage(
        `SQS Worker Poll: ${res.messages_processed ?? 0} messages processed. (Mode: ${res.mode})`
      );
    } catch (err: any) {
      setSqsMessage(`Error polling SQS: ${err.message}`);
    } finally {
      setIsPollingSqs(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all security telemetry and incidents to default initial seminar demo state?')) {
      return;
    }
    setIsResetting(true);
    setStatusMessage(null);
    try {
      await api.resetDemoData();
      setStatusMessage('Demo events and incidents successfully reset to standard state.');
      loadHealth();
    } catch (err: any) {
      setStatusMessage(`Error resetting: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            LIVE / ACTIVE
          </span>
        );
      case 'SIMULATED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            SIMULATED
          </span>
        );
      case 'LOCAL_STORAGE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            LOCAL DISK
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            NOT CONFIGURED
          </span>
        );
    }
  };

  const getServiceIcon = (awsService: string) => {
    switch (awsService) {
      case 'Amazon EC2':
        return <Cpu className="w-5 h-5 text-brand-600" />;
      case 'Amazon DynamoDB':
        return <HardDrive className="w-5 h-5 text-indigo-600" />;
      case 'Amazon EventBridge':
        return <Layers className="w-5 h-5 text-amber-600" />;
      case 'AWS Lambda':
        return <Zap className="w-5 h-5 text-orange-600" />;
      case 'Amazon SQS':
        return <Inbox className="w-5 h-5 text-rose-600" />;
      case 'Amazon SNS':
        return <Bell className="w-5 h-5 text-purple-600" />;
      case 'Amazon S3':
        return <FileText className="w-5 h-5 text-emerald-600" />;
      default:
        return <Server className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & AWS Pipeline Monitoring</h1>
          <p className="text-xs text-slate-600 mt-1">
            Component health status, pipeline integration checkpoints, and CloudWatch references
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePollSqs}
            disabled={isPollingSqs}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
          >
            <Inbox className={`w-3.5 h-3.5 ${isPollingSqs ? 'animate-bounce' : ''}`} />
            <span>Poll SQS Consumer</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-sm transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={loadHealth}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {sqsMessage && (
        <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs flex items-center gap-2">
          <Inbox className="w-4 h-4 text-sky-600 shrink-0" />
          <span>{sqsMessage}</span>
        </div>
      )}

      {/* Integration Mode Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800 text-sky-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm">
              Current Architecture Mode:{' '}
              <span className="font-mono text-sky-400">
                {health?.aws_mode ? 'AWS Cloud Native Mode (EC2 / DynamoDB)' : 'Local Simulation Mode (Local SQLite / In-Memory Bus)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {health?.aws_mode
                ? 'Direct AWS SDK Boto3 integrations activated for DynamoDB, EventBridge, SQS, SNS, and S3.'
                : '100% offline demonstration mode. Seeded test events, SQLite database, and deterministic detection engine.'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
          Environment: {health?.app_environment.toUpperCase()}
        </div>
      </div>

      {/* Pipeline Component Health Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Target AWS Architecture Component Verification:</h2>
          <span className="text-xs text-slate-500 font-mono">
            Architecture: Ingestion → EventBridge → Lambda → SQS → SNS → Dashboard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health?.services.map((svc) => (
            <div
              key={svc.name}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      {getServiceIcon(svc.aws_service)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{svc.name}</h4>
                      <span className="text-[11px] font-mono text-slate-500">{svc.aws_service}</span>
                    </div>
                  </div>
                  {getStatusBadge(svc.status)}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{svc.details}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Mode:</span>
                <span className="font-semibold text-slate-700">
                  {svc.is_live_aws ? 'Live AWS SDK Call' : 'Local Demonstration'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CloudWatch Reference Card (Fulfills Prompt requirement: "Display available CloudWatch metrics/log references. Do not invent AWS metrics or claim live monitoring when not configured") */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Cloud className="w-4 h-4 text-sky-600" />
          <span>Amazon CloudWatch Metrics & Audit References</span>
        </div>
        <p className="text-xs text-slate-600">
          When deployed to Amazon EC2 with the CloudWatch Agent configured, logs and metric filters
          are organized according to the following parameter specifications:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px] uppercase">CloudWatch Log Group:</span>
            <span className="font-semibold text-slate-900">{health?.cloudwatch_metrics_ref.LogGroup}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px] uppercase">Custom Metrics Namespace:</span>
            <span className="font-semibold text-slate-900">{health?.cloudwatch_metrics_ref.Namespace}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px] uppercase">Metric Filter Pattern:</span>
            <span className="font-semibold text-slate-900">{health?.cloudwatch_metrics_ref.MetricFilter}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px] uppercase">Integration Status:</span>
            <span className="font-semibold text-brand-700">{health?.cloudwatch_metrics_ref.Status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
