import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Login } from './pages/Login';

// Admin Pages
import { Dashboard } from './pages/Dashboard';
import { SecurityEvents } from './pages/SecurityEvents';
import { IncidentManagement } from './pages/IncidentManagement';
import { AdminAlerts } from './pages/admin/AdminAlerts';
import { SystemMonitoring } from './pages/SystemMonitoring';
import { Reports } from './pages/Reports';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ThreatSimulator } from './pages/ThreatSimulator';

// Normal User Pages (Final 5 Structure)
import { UserDashboard } from './pages/user/UserDashboard';
import { UserResources } from './pages/user/UserResources';
import { UserMail } from './pages/user/UserMail';
import { UserNotifications } from './pages/user/UserNotifications';
import { UserProfilePage } from './pages/user/UserProfilePage';
import { UserRuleSandbox } from './pages/user/UserRuleSandbox';

const MainLayout: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [isUserViewMode, setIsUserViewMode] = useState(false);

  // Default tab based on role
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [awsMode, setAwsMode] = useState<boolean>(false);

  // Synchronize default tab on user login or role change and check AWS mode
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setIsUserViewMode(false);
        setCurrentTab('overview');
      } else {
        setIsUserViewMode(true);
        setCurrentTab('user-dashboard');
      }
      // Check backend AWS mode
      import('./services/api').then(({ api }) => {
        api.getSystemHealth().then((health) => {
          setAwsMode(health.aws_mode);
        }).catch(() => {});
      });
    }
  }, [user?.role]);

  const [openIncidentsCount, setOpenIncidentsCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Real-time synchronization of notifications and incidents counts across all portals
  useEffect(() => {
    if (!user) return;

    const syncTelemetry = async () => {
      try {
        const { api } = await import('./services/api');
        if (isAdmin && !isUserViewMode) {
          const res = await api.getIncidents({ limit: 100 });
          const items = (res as any)?.items || (Array.isArray(res) ? res : []);
          const open = items.filter((i: any) => i.status === 'OPEN').length;
          setOpenIncidentsCount(open);
        } else {
          const notifs = await api.getUserNotifications();
          const unread = (notifs || []).filter((n: any) => !n.read).length;
          setUnreadNotificationsCount(unread);
        }
      } catch (e) {}
    };

    syncTelemetry();
    const interval = setInterval(syncTelemetry, 2500);

    const handleUpdate = () => syncTelemetry();
    window.addEventListener('cloudshield:notification-update', handleUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cloudshield_telemetry');
      bc.onmessage = () => syncTelemetry();
    } catch (e) {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('cloudshield:notification-update', handleUpdate);
      if (bc) bc.close();
    };
  }, [user, isAdmin, isUserViewMode]);

  const handleToggleUserViewMode = () => {
    if (!isUserViewMode) {
      setIsUserViewMode(true);
      setCurrentTab('user-dashboard');
    } else {
      setIsUserViewMode(false);
      setCurrentTab('overview');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Initializing CloudShield Platform...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        awsMode={awsMode}
        isUserViewMode={isUserViewMode}
        onToggleUserViewMode={isAdmin ? handleToggleUserViewMode : undefined}
      />
      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isAdmin={isAdmin}
          isUserViewMode={isUserViewMode}
          openIncidentsCount={openIncidentsCount}
          unreadNotificationsCount={unreadNotificationsCount}
        />
        <main className="flex-1 overflow-x-hidden pb-12">
          {/* Admin Views */}
          {currentTab === 'overview' && <Dashboard onNavigateTab={setCurrentTab as any} />}
          {currentTab === 'events' && <SecurityEvents />}
          {currentTab === 'incidents' && <IncidentManagement />}
          {currentTab === 'alerts' && <AdminAlerts />}
          {currentTab === 'system' && <SystemMonitoring />}
          {currentTab === 'reports' && <Reports />}
          {currentTab === 'users' && <AdminUsers />}
          {currentTab === 'settings' && <AdminSettings />}
          {currentTab === 'simulator' && (
            <ThreatSimulator
              onNavigateToEvents={() => setCurrentTab('events')}
              onNavigateToIncidents={() => setCurrentTab('incidents')}
            />
          )}

          {/* Normal User Views (Final 5-Page Structure) */}
          {currentTab === 'user-dashboard' && (
            <UserDashboard onNavigateTab={(tab) => setCurrentTab(`user-${tab}` as NavTab)} />
          )}
          {currentTab === 'user-resources' && (
            <UserResources onNavigateTab={(tab) => setCurrentTab(`user-${tab}` as NavTab)} />
          )}
          {currentTab === 'user-mail' && <UserMail />}
          {currentTab === 'user-notifications' && <UserNotifications />}
          {currentTab === 'user-profile' && <UserProfilePage />}

          {/* Compatibility aliases */}
          {currentTab === 'user-sandbox' && <UserResources />}
          {currentTab === 'user-mailbox' && <UserMail />}
          {currentTab === 'user-simulations' && <UserMail />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
