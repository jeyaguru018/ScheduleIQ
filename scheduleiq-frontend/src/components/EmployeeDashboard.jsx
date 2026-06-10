import React from 'react';
import { Avatar } from './common/Avatar';
import { 
  Bell, 
  CalendarDays, 
  MapPin, 
  Briefcase, 
  ArrowRightLeft, 
  Home, 
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { SparklesIcon } from './AiGenerator'; // Re-use the SVG from AiGenerator
import { useToast } from './common/Toast';

export function EmployeeDashboard({ user, onOpenProfile, onLogout }) {
  const { showToast } = useToast();
  // Mobile app container simulation for desktop viewing
  return (
    <div className="flex-1 bg-surface-variant flex justify-center items-center h-full overflow-hidden">
      <div className="w-full max-w-[400px] h-full bg-surface shadow-2xl relative flex flex-col overflow-hidden sm:rounded-3xl sm:h-[850px] border border-outline-variant">
        
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-surface z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1e1a8a] rounded flex items-center justify-center">
              <SparklesIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[#1e1a8a]">ScheduleIQ</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-error transition-colors relative" onClick={onLogout} title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant relative" onClick={() => showToast("You have no new notifications", "success")}>
              <Bell className="w-5 h-5" />
              <div className="absolute top-2 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></div>
            </button>
            <button onClick={onOpenProfile}>
              <Avatar name={user?.name || 'Priya'} size="md" className="border-2 border-surface shadow-sm" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          <div className="px-6 space-y-6">
            
            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Good morning, {user?.name?.split(' ')[0] || 'Priya'} 👋</h1>
              <p className="text-sm text-on-surface-variant mt-1">Here is your schedule for the upcoming week.</p>
            </div>

            {/* Next Shift Hero Card */}
            <div className="bg-[#1e1a8a] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start mb-6">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">Next Shift</span>
                <CalendarDays className="w-5 h-5 text-white/80" />
              </div>
              
              <div className="mb-6">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Today</p>
                <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">2:00 PM<br/>– 10:00 PM</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
                  <MapPin className="w-4 h-4 text-white/60" /> Velachery Hub
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
                  <Briefcase className="w-4 h-4 text-white/60" /> Fulfillment Specialist
                </div>
                <div className="mt-4 inline-block bg-white/10 px-3 py-1 rounded border border-white/10 text-xs font-bold">
                  Rate: ₹450/hr
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-bold text-on-surface mb-4">This Week</h3>
              
              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent">
                
                {/* Completed */}
                <div className="relative flex items-center justify-between pl-6 py-3 border border-outline-variant/50 rounded-xl bg-surface-variant/30">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-outline-variant"></div>
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-wider">Mon, Oct 12</p>
                    <p className="text-sm font-semibold text-on-surface-variant">8:00 AM – 4:00 PM</p>
                  </div>
                  <span className="text-[10px] font-bold text-outline bg-surface-variant px-2 py-1 rounded uppercase tracking-wider mr-4">Completed</span>
                </div>

                {/* Today */}
                <div className="relative flex items-center justify-between pl-6 py-4 border-l-4 border-l-[#1e1a8a] border-y border-r border-outline-variant rounded-xl bg-white shadow-sm my-2">
                  <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#1e1a8a] border-2 border-white"></div>
                  <div>
                    <p className="text-xs font-bold text-[#1e1a8a] uppercase tracking-wider flex items-center gap-2">Tue, Oct 13 • Today</p>
                    <p className="text-base font-bold text-on-surface mt-0.5">2:00 PM – 10:00 PM</p>
                    <p className="text-xs font-semibold text-on-surface-variant mt-1">Velachery Hub • Fulfillment</p>
                  </div>
                </div>

                {/* Pending Swap */}
                <div className="relative flex flex-col pl-6 py-4 border-l-4 border-l-[#f59e0b] border-y border-r border-outline-variant rounded-xl bg-white shadow-sm">
                  <div className="absolute left-[-2px] top-6 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-bold text-outline uppercase tracking-wider">Wed, Oct 14</p>
                      <p className="text-sm font-semibold text-on-surface mt-0.5 text-outline-variant line-through">2:00 PM – 10:00 PM</p>
                    </div>
                    <div className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-outline mr-4">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="bg-[#f0fdf4] border border-success/20 rounded-lg p-3 mr-4 flex items-start gap-2">
                    <SparklesIcon className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-success/90">Swap is valid and sent for manager approval. Replacing with Rahul K.</p>
                  </div>
                </div>

                {/* Future Shifts */}
                <div className="relative flex items-center justify-between pl-6 py-3 border border-outline-variant rounded-xl bg-white">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-outline-variant"></div>
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-wider">Thu, Oct 15</p>
                    <p className="text-sm font-bold text-on-surface">10:00 AM – 6:00 PM</p>
                    <p className="text-xs font-medium text-on-surface-variant mt-0.5">Anna Nagar Hub • Receiving</p>
                  </div>
                  <button className="mr-4 text-xs font-bold text-[#1e1a8a] border border-[#1e1a8a]/30 px-3 py-1.5 rounded-lg hover:bg-[#1e1a8a]/5">Swap</button>
                </div>

                <div className="relative flex items-center justify-between pl-6 py-3 border border-outline-variant rounded-xl bg-white">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-outline-variant"></div>
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-wider">Fri, Oct 16</p>
                    <p className="text-sm font-bold text-on-surface">10:00 AM – 6:00 PM</p>
                    <p className="text-xs font-medium text-on-surface-variant mt-0.5">Anna Nagar Hub • Receiving</p>
                  </div>
                  <button className="mr-4 text-xs font-bold text-[#1e1a8a] border border-[#1e1a8a]/30 px-3 py-1.5 rounded-lg hover:bg-[#1e1a8a]/5">Swap</button>
                </div>

                {/* Weekend Off */}
                <div className="relative flex items-center justify-between pl-6 py-4 border border-outline-variant rounded-xl bg-surface-variant/30">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-outline-variant"></div>
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-wider">Sat & Sun</p>
                    <p className="text-sm font-semibold text-on-surface-variant">Scheduled Off</p>
                  </div>
                  <Coffee className="w-5 h-5 text-outline mr-4" />
                </div>

              </div>
            </div>
            
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-surface border-t border-outline-variant flex justify-around items-center px-6 pb-2 z-20">
          <button className="flex flex-col items-center gap-1 text-[#1e1a8a]">
            <div className="w-12 h-8 rounded-full bg-[#1e1a8a] flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-outline hover:text-on-surface transition-colors mt-2" onClick={() => showToast("Full schedule view coming soon!")}>
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-bold">Schedule</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-outline hover:text-on-surface transition-colors mt-2 relative" onClick={() => showToast("Swap marketplace coming soon!")}>
            <ArrowRightLeft className="w-6 h-6" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border border-surface"></div>
            <span className="text-[10px] font-bold">Swap</span>
          </button>
          <button onClick={onOpenProfile} className="flex flex-col items-center gap-1 text-outline hover:text-on-surface transition-colors mt-2">
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}
