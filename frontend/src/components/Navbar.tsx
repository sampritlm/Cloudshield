import React from 'react';
import { Shield, Bell, Cloud, Laptop, LogOut, User, Eye, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  awsMode?: boolean;
  isUserViewMode?: boolean;
  onToggleUserViewMode?: () => void;
}

export const Navbar: React.FC<Props> = ({
  awsMode = false,
  isUserViewMode = false,
  onToggleUserViewMode
}) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
          <Shield className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">CloudShield</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-200 pl-2">
            Intelligent Cloud Security Monitoring & Automated Threat Detection
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* If Admin, allow previewing normal user view */}
        {isAdmin && onToggleUserViewMode && (
          <button
            onClick={onToggleUserViewMode}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isUserViewMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
            }`}
          >
            {isUserViewMode ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Return to Admin Console</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Normal User View</span>
              </>
            )}
          </button>
        )}

        {/* Environment Mode Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border bg-slate-50 border-slate-200 text-slate-700">
          {awsMode ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-amber-500" />
              <span>AWS Mode (EC2/DynamoDB)</span>
            </>
          ) : (
            <>
              <Laptop className="w-3.5 h-3.5 text-sky-600" />
              <span>Local Dev / Simulation Mode</span>
            </>
          )}
        </div>

        {/* User profile & role badge */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {user.role === 'admin' ? (
                  <span className="text-indigo-600 font-bold">Administrator</span>
                ) : (
                  <span className="text-sky-600 font-bold">Normal User</span>
                )}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase">
              {user.name.slice(0, 2)}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
