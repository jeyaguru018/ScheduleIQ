import React, { useState, useEffect, lazy, Suspense } from 'react';
import * as api from './api';

// Layout (always needed — loaded eagerly)
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProfileModal } from './components/ProfileModal';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Heavy page components — lazy loaded on demand (reduces initial bundle by ~60%)
const CommandCenter    = lazy(() => import('./components/CommandCenter').then(m => ({ default: m.CommandCenter })));
const AiGenerator      = lazy(() => import('./components/AiGenerator').then(m => ({ default: m.AiGenerator })));
const DemandForecast   = lazy(() => import('./components/DemandForecast').then(m => ({ default: m.DemandForecast })));
const EmployeeRoster   = lazy(() => import('./components/EmployeeRoster').then(m => ({ default: m.EmployeeRoster })));
const FairnessEquity   = lazy(() => import('./components/FairnessEquity').then(m => ({ default: m.FairnessEquity })));
const SwapMarketplace  = lazy(() => import('./components/SwapMarketplace').then(m => ({ default: m.SwapMarketplace })));
const AlertCenter      = lazy(() => import('./components/AlertCenter').then(m => ({ default: m.AlertCenter })));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard })));
const ControlRoom      = lazy(() => import('./components/ControlRoom').then(m => ({ default: m.ControlRoom })));

// Loading fallback for lazy components
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-surface-variant/30">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm font-semibold text-outline">Loading module...</p>
    </div>
  </div>
);

import { useWebSocketAlerts } from './lib/websocket';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Global listener for live WebSocket alerts
  useWebSocketAlerts((newAlert) => {
    // Only show toast if logged in user is a MANAGER
    if (user && user.role === 'MANAGER') {
      const empName = newAlert.employee ? newAlert.employee.name : 'Open Shift';
      const riskPct = Math.round(newAlert.noShowRisk * 100);
      setToast({
        message: `🚨 Critical Alert: ${empName} has a high no-show risk of ${riskPct}% for their upcoming shift!`,
        id: newAlert.id
      });
      // Clear toast after 10 seconds
      setTimeout(() => {
        setToast(prev => prev && prev.id === newAlert.id ? null : prev);
      }, 10000);
    }
  });

  useEffect(() => {
    // Check if redirecting from Google OAuth2 login
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const role = params.get('role');
    const name = params.get('name');
    const employeeId = params.get('employeeId');

    // Check if the page is being opened freshly (not a reload or back/forward)
    // and we're not currently doing a Google OAuth redirection.
    const navEntries = performance.getEntriesByType("navigation");
    const isNavigate = navEntries.length > 0 && navEntries[0].type === 'navigate';
    const isGoogleRedirect = !!(token && role && name);

    if (isNavigate && !isGoogleRedirect) {
      // Clear token and user on fresh navigation to require log in
      api.clearToken();
    }

    if (token && role && name) {
      api.setToken(token);
      const userData = { name, role, employeeId: employeeId ? parseInt(employeeId) : null };
      api.setUser(userData);
      setUser(userData);
      setCurrentPage(role === 'MANAGER' ? 'dashboard' : 'employee_view');
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(false);
      return;
    }

    // Check if user is logged in on mount
    const savedUser = api.getUser();
    if (savedUser) {
      setUser(savedUser);
      setCurrentPage(savedUser.role === 'MANAGER' ? 'dashboard' : 'employee_view');
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentPage(userData.role === 'MANAGER' ? 'dashboard' : 'employee_view');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface text-primary">Loading...</div>;
  }

  // Render Login Page if not authenticated
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- EMPLOYEE VIEW (Mobile Layout) ---
  if (user.role !== 'MANAGER' && currentPage === 'employee_view') {
    return (
      <>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <EmployeeDashboard user={user} onOpenProfile={() => setIsProfileOpen(true)} onLogout={handleLogout} />
          </Suspense>
        </ErrorBoundary>
        <ProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          user={user} 
          onUpdate={(newName) => setUser({...user, name: newName})} 
        />
      </>
    );
  }

  // --- MANAGER VIEW (Desktop Layout) ---
  const renderView = () => {
    switch (currentPage) {
      case 'dashboard': return <CommandCenter />;
      case 'control_room': return <ControlRoom />;
      case 'ai_generator': return <AiGenerator />;
      case 'demand_forecast': return <DemandForecast />;
      case 'roster': return <EmployeeRoster />;
      case 'equity': return <FairnessEquity />;
      case 'swap_market': return <SwapMarketplace />;
      case 'alert_center': return <AlertCenter />;
      default: return <CommandCenter />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        role={user.role} 
        user={user} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-surface-variant relative">
        <Header 
          title={currentPage} 
          user={user} 
          onOpenProfile={() => setIsProfileOpen(true)} 
          onNavigate={(page) => setCurrentPage(page)}
        />
        
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Live WebSocket Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#dc2626] text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-white/20 animate-in slide-in-from-bottom duration-300">
          <div className="flex-1">
            <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
            <button 
              onClick={() => { setCurrentPage('alert_center'); setToast(null); }}
              className="text-xs font-bold underline mt-2 block hover:text-white/80"
            >
              Review in Alert Center →
            </button>
          </div>
          <button onClick={() => setToast(null)} className="text-white/80 hover:text-white font-bold text-sm leading-none">✕</button>
        </div>
      )}

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
        onUpdate={(newName) => setUser({...user, name: newName})} 
      />
    </div>
  );
}

export default App;
