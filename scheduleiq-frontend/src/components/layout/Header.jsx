import React from 'react';
import { Bell, Settings, SearchIcon, User } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { DarkModeToggle } from '../DarkModeToggle';

export function Header({ title, user, onOpenProfile, onNavigate }) {
  const { showToast } = useToast();
  return (
    <header className="h-16 flex items-center justify-between px-8 bg-surface border-b border-outline-variant shrink-0 transition-colors duration-200">
      <div className="flex-1 flex items-center gap-8">
        {/* Search Bar */}
        <div className="relative w-96 hidden md:block">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Search resources, shifts, employees..."
            className="w-full pl-10 pr-4 py-2 bg-surface-variant border border-outline-variant/80 rounded-xl text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/70 focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                showToast(`Searching for "${e.target.value}"...`);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Wrapper with Tooltip/Style */}
        <div className="flex items-center gap-2 bg-surface-variant/60 p-1 px-2 rounded-full border border-outline-variant/50" title="Toggle Theme">
          <DarkModeToggle />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface-variant rounded-full hover:bg-surface-variant relative"
          onClick={() => onNavigate && onNavigate('alert_center')}
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse"></span>
        </Button>

        <div className="h-6 w-[1px] bg-outline-variant mx-1"></div>

        {/* User Account / Profile Edit Button */}
        <button
          onClick={onOpenProfile}
          title="Click to edit user profile"
          className="flex items-center gap-2.5 bg-surface-variant/40 hover:bg-surface-variant p-1.5 pl-2 pr-3 rounded-full border border-outline-variant/60 transition-all group cursor-pointer"
        >
          <Avatar name={user?.name} size="sm" className="ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all" />
          <div className="text-left hidden sm:block">
            <div className="text-xs font-extrabold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1">
              {user?.name}
              <Settings className="w-3 h-3 text-on-surface-variant group-hover:rotate-45 transition-transform" />
            </div>
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Edit Account</div>
          </div>
        </button>
      </div>
    </header>
  );
}
