import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Download,
  Activity,
  AlertTriangle,
  Target,
  Mail,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { SecurityEvent } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { EventDetailModal } from '../components/EventDetailModal';

export const SecurityEvents: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const loadEvents = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getEvents({
        page,
        limit,
        severity: severityFilter,
        event_type: eventTypeFilter,
        search: searchQuery.trim() || undefined,
      });
      setEvents(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(false);
  }, [page, severityFilter, eventTypeFilter]);

  // Real-time stream sync with DynamoDB / EventBridge
  useEffect(() => {
    const interval = setInterval(() => {
      loadEvents(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [page, severityFilter, eventTypeFilter, searchQuery]);

  // Keep scroll aligned to start so table is never horizontally clipped
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = 0;
    }
  }, [events, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEvents();
  };

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Telemetry quick counts
  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const honeypotCount = events.filter(
    (e) =>
      e.event_type?.includes('HONEYPOT') ||
      e.triggered_rules?.some((r: string) => r.includes('HONEYPOT')) ||
      e.action?.includes('HONEYPOT')
  ).length;
  const caniphishCount = events.filter((e) => e.source_platform === 'CANIPHISH').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security Event Stream</h1>
            <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              Live Ingest
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Raw event telemetry ingested through Amazon EventBridge / local monitoring pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => loadEvents()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Stream Events</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            <Activity className="w-5 h-5 text-slate-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Critical Risks</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{criticalCount}</div>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Honeypot Decoy Hits</div>
            <div className="text-2xl font-bold text-purple-700 mt-1">{honeypotCount}</div>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">
            <Target className="w-5 h-5 text-purple-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">CanIPhish Phishing Lures</div>
            <div className="text-2xl font-bold text-sky-700 mt-1">{caniphishCount}</div>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-lg border border-sky-100">
            <Mail className="w-5 h-5 text-sky-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by ID, test user, IP, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">Low (0-30)</option>
              <option value="MEDIUM">Medium (31-60)</option>
              <option value="HIGH">High (61-80)</option>
              <option value="CRITICAL">Critical (81-100)</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Type:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="HONEYPOT_TRIGGER">Honeypot Deception</option>
              <option value="LOGIN_FAILURE">Login Failures</option>
              <option value="UNUSUAL_IP_ACCESS">Unusual IP</option>
              <option value="UNAUTHORIZED_RESOURCE_ACCESS">Unauthorized Access</option>
              <option value="API_REQUEST_BURST">Request Bursts</option>
              <option value="COMBINED_SUSPICIOUS_ACTIVITY">Combined Threat</option>
              <option value="NORMAL_ACCESS">Normal Access</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div ref={tableContainerRef} className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Event ID &amp; Time</th>
                <th className="py-3 px-4">Event Type &amp; Action</th>
                <th className="py-3 px-4">Identity &amp; Origin IP</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4 whitespace-nowrap">Source</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Score</th>
                <th className="py-3 px-4 whitespace-nowrap">Severity</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading events telemetry...</span>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No security events found matching the criteria.
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const isHoneypot =
                    evt.event_type?.includes('HONEYPOT') ||
                    evt.triggered_rules?.some((r: string) => r.includes('HONEYPOT')) ||
                    evt.action?.includes('HONEYPOT');

                  const shortId =
                    evt.event_id.length > 18
                      ? `${evt.event_id.slice(0, 8)}…${evt.event_id.slice(-4)}`
                      : evt.event_id;

                  return (
                    <tr
                      key={evt.event_id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isHoneypot ? 'bg-purple-50/20' : ''
                      }`}
                    >
                      {/* Column 1: Event ID & Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 group">
                          <span
                            className="font-mono font-bold text-slate-900 group-hover:text-brand-600 transition-colors"
                            title={evt.event_id}
                          >
                            {shortId}
                          </span>
                          <button
                            onClick={(e) => handleCopyId(e, evt.event_id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                            title="Copy full Event ID"
                          >
                            {copiedId === evt.event_id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {new Date(evt.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Column 2: Event Type & Action */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span className="truncate max-w-[200px]" title={evt.action}>
                            {evt.action}
                          </span>
                          {isHoneypot && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300 uppercase tracking-wider">
                              HONEYPOT
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                          {evt.event_type}
                        </div>
                      </td>

                      {/* Column 3: Identity & Origin IP */}
                      <td className="py-3 px-4">
                        <div
                          className="font-semibold text-slate-900 truncate max-w-[170px]"
                          title={evt.test_user}
                        >
                          {evt.test_user}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>{evt.source_ip}</span>
                        </div>
                      </td>

                      {/* Column 4: Target Resource */}
                      <td className="py-3 px-4">
                        <div
                          className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200/80 truncate max-w-[170px]"
                          title={evt.resource}
                        >
                          {evt.resource}
                        </div>
                      </td>

                      {/* Column 5: Source Platform */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {evt.source_platform === 'CANIPHISH' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            CanIPhish
                          </span>
                        ) : isHoneypot ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                            Honeypot Trap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Simulated
                          </span>
                        )}
                      </td>

                      {/* Column 6: Score */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            evt.risk_score >= 80
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : evt.risk_score >= 50
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {evt.risk_score}
                        </span>
                      </td>

                      {/* Column 7: Severity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SeverityBadge severity={evt.severity} size="sm" />
                      </td>

                      {/* Column 8: Details Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 shadow-sm transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {events.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of <span className="font-bold text-slate-800">{total}</span> events
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-semibold px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};
