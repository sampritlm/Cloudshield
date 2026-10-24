import React, { useState, useEffect } from 'react';
import {
  FolderDown,
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  Shield,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Filter,
  ExternalLink,
  Info,
  Check,
  HardDrive,
  Lock,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Ban
} from 'lucide-react';
import { api } from '../../services/api';

export interface SecurityResource {
  id: string;
  title: string;
  category: string;
  description: string;
  file_name: string;
  file_type: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'CSV';
  file_size: string;
  badge: string;
  version: string;
  last_updated: string;
  restricted: boolean;
  required_role: string;
}

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const UserResources: React.FC<Props> = ({ onNavigateTab }) => {
  const [resources, setResources] = useState<SecurityResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'ALLOWED' | 'RESTRICTED'>('ALL');
  
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [recentlyDownloaded, setRecentlyDownloaded] = useState<string | null>(null);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserDownloadableResources();
      setResources(data || []);
    } catch (err) {
      console.error('Failed to load downloadable resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (resource: SecurityResource) => {
    setDownloadingId(resource.id);
    setRecentlyDownloaded(null);
    setAccessDeniedNotice(null);

    try {
      const res = await api.downloadResourceFile(resource.id);
      if (res.success) {
        setRecentlyDownloaded(res.filename || resource.title);
        setTimeout(() => setRecentlyDownloaded(null), 5000);
      } else {
        // Access Denied by detector on restricted resource
        setAccessDeniedNotice(`Access Denied: You do not have permission to download "${resource.title}". Unauthorized access attempts are monitored and recorded.`);
        setTimeout(() => setAccessDeniedNotice(null), 7000);

        // Instant real-time broadcast across Admin and User portals
        window.dispatchEvent(new CustomEvent('cloudshield:notification-update'));
        try {
          const bc = new BroadcastChannel('cloudshield_telemetry');
          bc.postMessage({ type: 'THREAT_EVENT', resource: resource.title });
          bc.close();
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setAccessDeniedNotice(`Access Denied: You do not have permission to download "${resource.title}".`);
    } finally {
      setDownloadingId(null);
    }
  };

  const categories = [
    'ALL',
    'Phishing Awareness',
    'Security Policies',
    'Password & MFA',
    'Incident Response',
    'Security Training',
    'Reference Materials'
  ];

  const filteredResources = resources.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesFormat = selectedFormat === 'ALL' || item.file_type === selectedFormat;
    const matchesAccess =
      accessFilter === 'ALL' ||
      (accessFilter === 'ALLOWED' && !item.restricted) ||
      (accessFilter === 'RESTRICTED' && item.restricted);
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesFormat && matchesAccess && matchesSearch;
  });

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'PDF':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: <FileText className="w-4 h-4 text-red-600" />
        };
      case 'DOCX':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <FileCheck className="w-4 h-4 text-blue-600" />
        };
      case 'XLSX':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        };
      case 'PPTX':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Presentation className="w-4 h-4 text-amber-600" />
        };
      case 'CSV':
      default:
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <FileSpreadsheet className="w-4 h-4 text-purple-600" />
        };
    }
  };

  const allowedCount = resources.filter((r) => !r.restricted).length;
  const restrictedCount = resources.filter((r) => r.restricted).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold font-mono">
              <FolderDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>CloudShield Security Documentation &bull; S3 Asset Vault</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Security Resources &amp; Downloadable Library
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Access certified enterprise cybersecurity documents and policy files. <strong>Allowed files</strong> are downloadable by all employees. <strong>Restricted files</strong> contain sensitive corporate and IAM assets requiring elevated privileges.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-emerald-400 font-mono">{allowedCount} Allowed</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">General Access</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-rose-400 font-mono">{restrictedCount} Restricted</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Protected Assets</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Access Denied Notification (Clean & Enterprise Standard) */}
      {accessDeniedNotice && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{accessDeniedNotice}</span>
          </div>
          <button
            onClick={() => setAccessDeniedNotice(null)}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Successful Download Toast */}
      {recentlyDownloaded && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Downloaded <strong>{recentlyDownloaded}</strong> successfully. Clean request (Risk: 0).</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700">General Access Authorized</span>
        </div>
      )}

      {/* 4. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides, policies, checklists, playbooks..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Access Filter (Allowed vs Restricted) */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1">Access:</span>
            <button
              onClick={() => setAccessFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                accessFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Files ({resources.length})
            </button>
            <button
              onClick={() => setAccessFilter('ALLOWED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                accessFilter === 'ALLOWED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <FileCheck className="w-3 h-3" />
              <span>Allowed Only ({allowedCount})</span>
            </button>
            <button
              onClick={() => setAccessFilter('RESTRICTED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                accessFilter === 'RESTRICTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Restricted Assets ({restrictedCount})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Resources Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-semibold text-slate-500 font-mono">Loading Security Documents...</div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <FolderDown className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No Matching Security Documents</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords or switching category filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedFormat('ALL');
              setAccessFilter('ALL');
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const fmt = getFormatBadge(res.file_type);
            const isDownloading = downloadingId === res.id;
            return (
              <div
                key={res.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group ${
                  res.restricted
                    ? 'border-rose-200/80 bg-rose-50/10 hover:border-rose-300'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        res.restricted
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {res.restricted ? (
                        <>
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>Restricted Asset</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>Allowed Document</span>
                        </>
                      )}
                    </span>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${fmt.bg}`}>
                      {fmt.icon}
                      <span>{res.file_type}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3 leading-snug group-hover:text-indigo-600 transition-colors">
                    {res.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                    {res.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[180px] text-slate-500">{res.file_name}</span>
                    <span>{res.file_size}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleDownload(res)}
                    disabled={isDownloading}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all focus:ring-2 disabled:opacity-50 bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-500"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying clearance...</span>
                      </>
                    ) : (
                      <>
                        {res.restricted ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Download className="w-3.5 h-3.5" />}
                        <span>Download {res.file_type}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Document Governance Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-2 font-semibold text-slate-700 text-xs">
          <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
          <span>Corporate Document Governance &amp; Information Security Policy</span>
        </div>
        <p className="leading-relaxed">
          All downloadable assets in this library are strictly governed by organizational Information Security and Acceptable Use policies. Access permissions are enforced based on role clearance. All download requests are audited.
        </p>
      </div>
    </div>
  );
};
