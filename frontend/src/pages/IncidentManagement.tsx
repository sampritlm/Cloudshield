import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  Clock,
  User,
  Globe,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, IncidentStatus } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import { useAuth } from '../context/AuthContext';

export const IncidentManagement: React.FC = () => {
  const { isAnalystOrAdmin } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const loadIncidents = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getIncidents({
        page,
        limit,
        severity: severityFilter,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setIncidents(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents(false);
  }, [page, severityFilter, statusFilter]);

  // Real-time synchronization with SQS / DynamoDB incidents
  useEffect(() => {
    const interval = setInterval(() => {
      loadIncidents(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [page, severityFilter, statusFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadIncidents();
  };

  const handleUpdateStatus = async (
    incidentId: string,
    newStatus: IncidentStatus,
    note?: string
  ) => {
    await api.updateIncidentStatus(incidentId, newStatus, note);
    loadIncidents();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security Incident Management</h1>
          <p className="text-xs text-slate-600 mt-1">
            Automated threat alerts dispatched from Amazon SQS / Detection Engine requiring SOC triage
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAnalystOrAdmin && (
            <span className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
              Role: Read-Only (User)
            </span>
          )}
          <button
            onClick={() => loadIncidents()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Incidents</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Incident ID, user, IP, or threat type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Incident ID & Date</th>
                <th className="py-3 px-4">Threat Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4">User & IP</th>
                <th className="py-3 px-4">Flagged Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Triage Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading incidents...</span>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No security incidents found matching criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.incident_id}
                    onClick={() => setSelectedIncident(inc)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{inc.incident_id}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {new Date(inc.detected_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 max-w-[170px] truncate">{inc.threat_type}</div>
                      <div className="font-mono text-[10px] text-slate-500">{inc.event_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {inc.risk_score}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 max-w-[150px] truncate">{inc.test_user}</div>
                      <div className="font-mono text-[11px] text-slate-500">{inc.source_ip}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="truncate text-slate-700" title={inc.reasons.join('; ')}>
                        {inc.reasons[0] || 'Rule violation flagged'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inc.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(inc);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded border border-brand-200"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {incidents.length} of <span className="font-bold text-slate-800">{total}</span> total incidents
          </div>
          <div className="text-[11px] text-slate-500">
            Lifecycle transitions: <span className="font-mono">OPEN</span> →{' '}
            <span className="font-mono">INVESTIGATING</span> → <span className="font-mono">RESOLVED</span>
          </div>
        </div>
      </div>

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
