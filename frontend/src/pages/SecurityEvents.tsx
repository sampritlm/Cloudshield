import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Download
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
      setEvents(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(false);
  }, [page, severityFilter, eventTypeFilter]);

  // Real-time stream sync with DynamoDB
  useEffect(() => {
    const interval = setInterval(() => {
      loadEvents(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [page, severityFilter, eventTypeFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEvents();
  };

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security Event Stream</h1>
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
            onClick={loadEvents}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Event ID & Time</th>
                <th className="py-3 px-4">Source Origin</th>
                <th className="py-3 px-4">Test User</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Event Type / Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading events...</span>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No security events found matching the criteria.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr
                    key={evt.event_id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{evt.event_id}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {new Date(evt.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {evt.source_platform === 'CANIPHISH' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-300 whitespace-nowrap">
                          CanIPhish Events
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                          Simulated/Test Data
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[150px]">
                        {evt.test_user}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {evt.source_ip}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{evt.action}</div>
                      <div className="font-mono text-[10px] text-slate-500 uppercase">{evt.event_type}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 truncate max-w-[160px]" title={evt.resource}>
                      {evt.resource}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {evt.risk_score}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={evt.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded border border-brand-200"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
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
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-semibold px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
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
