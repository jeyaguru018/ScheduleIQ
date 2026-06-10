import React from 'react';
import { cn } from '../../lib/utils';
import { Avatar } from '../common/Avatar';
import { 
  LayoutDashboard, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Scale, 
  ArrowLeftRight, 
  AlertTriangle,
  CalendarDays,
  LogOut
} from 'lucide-react';

export function Sidebar({ currentPage, setCurrentPage, role, user, onLogout }) {
  const managerLinks = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'ai_generator', label: 'AI Generator', icon: Sparkles },
    { id: 'demand_forecast', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'equity', label: 'Equity Reports', icon: Scale },
    { id: 'swap_market', label: 'Swap Marketplace', icon: ArrowLeftRight },
    { id: 'alert_center', label: 'Alert Center', icon: AlertTriangle },
  ];

  const employeeLinks = [
    { id: 'employee_view', label: 'My Schedule', icon: CalendarDays },
    { id: 'swap_market', label: 'Swap Shifts', icon: ArrowLeftRight },
  ];

  const links = role === 'MANAGER' ? managerLinks : employeeLinks;

  return (
    <aside className="w-64 flex flex-col bg-surface border-r border-outline-variant h-full shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-outline-variant shrink-0">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center mr-3">
          <Sparkles className="w-5 h-5 text-on-primary" />
        </div>
        <div>
          <h1 className="text-title-md font-title-md font-bold text-on-surface leading-tight">ScheduleIQ</h1>
          <p className="text-label-sm text-on-surface-variant font-medium text-[10px] uppercase tracking-wider">AI Workforce Orchestration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        {links.map((link) => {
          const isActive = currentPage === link.id;
          const Icon = link.icon;
          return (
            <button
              key={link.id}
              onClick={() => setCurrentPage(link.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-label-md font-label-md font-semibold transition-all",
                isActive 
                  ? "bg-primary-container/40 text-primary border border-primary/20 shadow-sm" 
                  : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-on-surface-variant")} />
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-outline-variant shrink-0">
        <div className="bg-surface-variant/50 rounded-xl p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} size="md" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-label-md font-bold text-on-surface truncate">{user?.name || 'User'}</p>
              <p className="text-body-sm text-on-surface-variant truncate">{user?.role === 'MANAGER' ? 'Ops Director' : user?.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-error hover:bg-error-container/50 transition-colors text-label-md font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
