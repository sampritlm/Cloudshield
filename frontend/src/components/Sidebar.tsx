import React from 'react';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Fish,
  Bell,
  Server,
  FileText,
  Users,
  Settings,
  Zap,
  Mail,
  BrainCircuit,
  BookOpen,
  User,
  Shield,
  ShieldAlert
} from 'lucide-react';

export type NavTab =
  // Admin tabs
  | 'overview'
  | 'events'
  | 'incidents'
  | 'caniphish'
  | 'alerts'
  | 'system'
  | 'reports'
  | 'users'
  | 'settings'
  | 'simulator'
  // Normal user tabs
  | 'user-dashboard'
  | 'user-simulations'
  | 'user-insights'
  | 'user-learning'
  | 'user-notifications'
  | 'user-profile';

interface Props {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isAdmin: boolean;
  isUserViewMode: boolean;
  openIncidentsCount?: number;
  unreadNotificationsCount?: number;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  isUserViewMode,
  openIncidentsCount = 0,
  unreadNotificationsCount = 2
}) => {
  // If in user mode (either a normal user, or an admin in preview user mode)
  const isUserView = !isAdmin || isUserViewMode;

  const adminNavItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'events' as NavTab,
      label: 'Security Events',
      icon: Activity,
      badge: 'DynamoDB',
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    },
    {
      id: 'incidents' as NavTab,
      label: 'Incident Management',
      icon: AlertTriangle,
      badge: openIncidentsCount > 0 ? `${openIncidentsCount} Open` : 'SQS',
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    },
    {
      id: 'caniphish' as NavTab,
      label: 'CanIPhish Integration',
      icon: Fish,
      badge: 'API v3',
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    },
    {
      id: 'alerts' as NavTab,
      label: 'Alerts & Notifications',
      icon: Bell,
      badge: 'SNS Live',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'system' as NavTab,
      label: 'AWS Monitoring',
      icon: Server,
      badge: 'CloudWatch',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Audit Logs',
      icon: FileText,
      badge: 'S3 / Trail',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'users' as NavTab,
      label: 'User Management',
      icon: Users,
      badge: 'IAM RBAC',
      badgeColor: 'bg-slate-700 text-slate-300 border border-slate-600',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
    {
      id: 'simulator' as NavTab,
      label: 'Threat Simulator',
      icon: Zap,
      badge: '5 Demos',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
  ];

  const userNavItems = [
    {
      id: 'user-dashboard' as NavTab,
      label: 'My Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'user-simulations' as NavTab,
      label: 'My Simulation Results',
      icon: Mail,
      badge: 'CanIPhish',
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    },
    {
      id: 'user-insights' as NavTab,
      label: 'My Risk Insights',
      icon: BrainCircuit,
      badge: null,
    },
    {
      id: 'user-learning' as NavTab,
      label: 'Security Awareness',
      icon: BookOpen,
      badge: 'Interactive',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'user-notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? `${unreadNotificationsCount} New` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'user-profile' as NavTab,
      label: 'My Profile',
      icon: User,
      badge: null,
    },
  ];

  const currentItems = isUserView ? userNavItems : adminNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Console Context Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {isUserView ? 'Employee Security Portal' : 'SOC Admin Console'}
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isUserView
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {isUserView ? 'User Role' : 'Admin Role'}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {isUserView ? 'Vigilance & Simulation Self-Service' : 'Intelligent Threat Detection & Response'}
        </div>
      </div>

      {/* Nav List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {currentItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Seminar Info */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
        <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>CloudShield Architecture</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          {isUserView
            ? 'Personal simulation scoring calculated by CloudShield deterministic security rules.'
            : 'Enterprise SOC monitoring powered by AWS EventBridge, SQS, SNS, and DynamoDB.'}
        </p>
      </div>
    </aside>
  );
};
