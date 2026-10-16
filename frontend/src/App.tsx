import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Login } from './pages/Login';

// Admin Pages
import { Dashboard } from './pages/Dashboard';
import { SecurityEvents } from './pages/SecurityEvents';
import { IncidentManagement } from './pages/IncidentManagement';
import { AdminCanIPhish } from './pages/admin/AdminCanIPhish';
import { AdminAlerts } from './pages/admin/AdminAlerts';
import { SystemMonitoring } from './pages/SystemMonitoring';
import { Reports } from './pages/Reports';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ThreatSimulator } from './pages/ThreatSimulator';

// Normal User Pages
import { UserDashboard } from './pages/user/UserDashboard';
import { UserSimulations } from './pages/user/UserSimulations';
import { UserInsights } from './pages/user/UserInsights';
import { UserLearning } from './pages/user/UserLearning';
import { UserNotifications } from './pages/user/UserNotifications';
import { UserProfilePage } from './pages/user/UserProfilePage';

const MainLayout: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [isUserViewMode, setIsUserViewMode] = useState(false);

  // Default tab based on role
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  // Synchronize default tab on user login or role change
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setIsUserViewMode(false);
        setCurrentTab('overview');
      } else {
        setIsUserViewMode(true);
        setCurrentTab('user-dashboard');
      }
    }
  }, [user?.role]);

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
        isUserViewMode={isUserViewMode}
        onToggleUserViewMode={isAdmin ? handleToggleUserViewMode : undefined}
      />
      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isAdmin={isAdmin}
          isUserViewMode={isUserViewMode}
        />
        <main className="flex-1 overflow-x-hidden pb-12">
          {/* Admin Views */}
          {currentTab === 'overview' && <Dashboard onNavigateTab={setCurrentTab as any} />}
          {currentTab === 'events' && <SecurityEvents />}
          {currentTab === 'incidents' && <IncidentManagement />}
          {currentTab === 'caniphish' && <AdminCanIPhish />}
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

          {/* Normal User Views */}
          {currentTab === 'user-dashboard' && (
            <UserDashboard onNavigateTab={(tab) => setCurrentTab(`user-${tab}` as NavTab)} />
          )}
          {currentTab === 'user-simulations' && <UserSimulations />}
          {currentTab === 'user-insights' && <UserInsights />}
          {currentTab === 'user-learning' && <UserLearning />}
          {currentTab === 'user-notifications' && <UserNotifications />}
          {currentTab === 'user-profile' && <UserProfilePage />}
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
