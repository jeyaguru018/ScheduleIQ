import React from 'react';
import { Bell, Settings, SearchIcon } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { DarkModeToggle } from '../DarkModeToggle';

export function Header({ title, user, onOpenProfile, onNavigate }) {
  const { showToast } = useToast();
  return (
    <header className="h-16 flex items-center justify-between px-8 bg-surface border-b border-outline-variant shrink-0">
      <div className="flex-1 flex items-center gap-8">
        {/* Search Bar */}
        <div className="relative w-96 hidden md:block">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-outline w-5 h-5" />
          <input
            type="text"
            placeholder="Search resources, shifts, employees..."
            className="w-full pl-10 pr-4 py-2 bg-surface-variant border border-outline-variant rounded-lg text-body-md text-on-surface placeholder:text-on-surface-variant focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                showToast(`Searching for "${e.target.value}"...`);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* v2.0 Dark Mode Toggle */}
        <DarkModeToggle />

        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface-variant rounded-full hover:bg-surface-variant relative"
          onClick={() => onNavigate && onNavigate('alert_center')}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface-variant rounded-full hover:bg-surface-variant"
          onClick={onOpenProfile}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 hover:bg-surface-variant p-1 pr-3 rounded-full transition-colors"
        >
          <Avatar name={user?.name} size="sm" />
          <span className="text-label-md font-bold text-on-surface hidden sm:block">{user?.name}</span>
        </button>
      </div>
    </header>
  );
}
