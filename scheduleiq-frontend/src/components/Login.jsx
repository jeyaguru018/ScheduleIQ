import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, CheckCircle2, Clock, Zap, User, DollarSign, Eye, EyeOff } from 'lucide-react';
import { Input } from './common/Input';
import { Button } from './common/Button';
import * as api from '../api';
import { useToast } from './common/Toast';

export function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRate, setRegRate] = useState('250');
  const [regHours, setRegHours] = useState('40');

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverWakingUp, setServerWakingUp] = useState(false);
  let wakeUpTimer = null;

  const { showToast } = useToast();

  useEffect(() => {
    // Check for Google OAuth2 errors
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'email_not_approved') {
      const targetEmail = params.get('email');
      showToast(`Access denied. Your Google account (${targetEmail || 'this Google account'}) has not been registered by a manager yet. Please ask your manager to create your account first.`, 'error', 5000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setServerWakingUp(false);
    // Show server wake-up message after 6 seconds
    const wakeTimer = setTimeout(() => setServerWakingUp(true), 6000);
    try {
      const data = await api.login(email, password);
      clearTimeout(wakeTimer);
      onLoginSuccess(data);
    } catch (err) {
      clearTimeout(wakeTimer);
      setServerWakingUp(false);
      const msg = err.message?.includes('timed out')
        ? 'Server is starting up (free tier). Please try again in 90 seconds.'
        : err.message?.includes('Failed to fetch') || err.message?.includes('fetch')
        ? 'Cannot reach server. Check your internet or try again in a moment.'
        : err.message || 'Invalid email or password.';
      showToast(msg, 'error', 7000);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setServerWakingUp(false);
    const wakeTimer = setTimeout(() => setServerWakingUp(true), 6000);
    try {
      const data = await api.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: 'MANAGER',
        baseHourlyRate: parseFloat(regRate) || 250.0,
        maxHoursPerWeek: parseInt(regHours) || 40
      });
      clearTimeout(wakeTimer);
      onLoginSuccess(data);
    } catch (err) {
      clearTimeout(wakeTimer);
      setServerWakingUp(false);
      const msg = err.message?.includes('timed out')
        ? 'Server is starting up (free tier). Please wait 90 seconds and try again.'
        : err.message?.includes('fetch')
        ? 'Cannot reach server. Try again in a moment.'
        : err.message || 'Registration failed. Please check your details.';
      showToast(msg, 'error', 7000);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    window.location.href = `${apiBaseUrl}/oauth2/authorization/google`;
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface">
      {/* Left Side: Branding & Premium Cards */}
      <div className="hidden lg:flex flex-col w-[45%] bg-[#2b25b3] relative overflow-hidden px-14 py-16 justify-between">
        <div className="absolute inset-0 grid-pattern pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-[#2b25b3]" />
            </div>
            <span className="text-2xl text-white font-bold tracking-tight">ScheduleIQ</span>
          </div>
          <h1 className="font-display text-white max-w-md leading-[1.1] mb-6 text-[44px] font-extrabold tracking-tight">
            Schedule smarter.<br/>
            Staff fairer.<br/>
            Grow faster.
          </h1>
          <p className="text-white/80 max-w-[380px] text-lg leading-relaxed">
            AI-powered workforce orchestration that balances operational efficiency with employee well-being.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-5 mt-12 mb-auto">
          {/* 4 hrs Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 w-[320px]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#86efac] flex items-center justify-center text-[#14532d]">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl text-white font-bold leading-none mb-1">4 hrs</div>
                <div className="text-xs text-white/60 font-bold uppercase tracking-wider">Saved/Week</div>
              </div>
            </div>
          </div>
          
          {/* 98% Coverage Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 w-[320px] ml-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#b45309] flex items-center justify-center text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl text-white font-bold leading-none mb-1">98%</div>
                <div className="text-xs text-white/60 font-bold uppercase tracking-wider">Coverage</div>
              </div>
            </div>
          </div>

          {/* 3x Faster Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 w-[320px]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#e0e7ff] flex items-center justify-center text-[#4338ca]">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="text-2xl text-white font-bold leading-none mb-1">3x</div>
                <div className="text-xs text-white/60 font-bold uppercase tracking-wider">Faster</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12">
          <p className="text-sm text-white/80 font-medium">Join thousands of managers optimizing their workforce.</p>
        </div>
      </div>

      {/* Right Side: Forms */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 bg-[#fafafa] relative overflow-y-auto">
        <div className="w-full max-w-[400px] flex flex-col my-auto">
          {!isRegistering ? (
            <>
              {/* Login Form */}
              <div className="mb-8">
                <h2 className="text-3xl text-on-surface font-extrabold tracking-tight mb-2">Welcome back</h2>
                <p className="text-on-surface-variant text-base">Sign in to manage your shifts and team.</p>
              </div>

              {/* Role Selector */}
              <div className="flex p-1 bg-surface-variant rounded-lg border border-outline-variant mb-6 shrink-0">
                <button 
                  onClick={() => setRole('manager')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role === 'manager' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Manager
                </button>
                <button 
                  onClick={() => setRole('employee')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role === 'employee' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Employee
                </button>
              </div>

              {/* Google Button */}
              <button 
                type="button" 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-outline-variant rounded-lg shadow-sm hover:bg-gray-50 transition-colors mb-6"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-outline-variant"></div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Or sign in with email</span>
                <div className="flex-1 h-px bg-outline-variant"></div>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Input 
                  label="Work Email" 
                  id="email" 
                  type="email" 
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
                
                <div className="relative">
                  <Input 
                    label="Password" 
                    id="password" 
                    type={showLoginPassword ? 'text' : 'password'}
                    icon={Lock}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(v => !v)}
                    className="absolute right-3 top-[2.1rem] text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword
                      ? <EyeOff className="w-5 h-5" />
                      : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button 
                  type="submit"
                  variant="primary"
                  className="w-full mt-2 bg-[#1e1a8a] hover:bg-[#1e1a8a]/90 text-white shadow-md py-3 text-base"
                  isLoading={loading}
                >
                  Sign In
                </Button>

                {/* Server wake-up indicator */}
                {loading && serverWakingUp && (
                  <div className="flex items-center gap-2 bg-[#fffbeb] border border-[#fcd34d] rounded-xl p-3 text-xs font-semibold text-[#b45309] animate-pulse">
                    <span className="text-base">⏳</span>
                    Server is waking up (free tier cold start). This can take up to 90 seconds on first login. Please wait...
                  </div>
                )}

                <div className="text-center mt-4">
                  <span className="text-sm text-on-surface-variant">Are you a manager? </span>
                  <button 
                    type="button" 
                    onClick={() => { setError(''); setIsRegistering(true); }}
                    className="text-sm font-bold text-[#1e1a8a] hover:underline"
                  >
                    Register Store Account
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Register Form */}
              <div className="mb-6">
                <h2 className="text-3xl text-on-surface font-extrabold tracking-tight mb-2">Create Manager Account</h2>
                <p className="text-on-surface-variant text-base">Setup your store to optimize your workforce.</p>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input 
                  label="Manager Full Name" 
                  id="regName" 
                  type="text" 
                  icon={User}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />

                <Input 
                  label="Work Email" 
                  id="regEmail" 
                  type="email" 
                  icon={Mail}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="jane@company.com"
                  required
                />
                
                <div className="relative">
                  <Input 
                    label="Password" 
                    id="regPassword" 
                    type={showRegPassword ? 'text' : 'password'}
                    icon={Lock}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(v => !v)}
                    className="absolute right-3 top-[2.1rem] text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword
                      ? <EyeOff className="w-5 h-5" />
                      : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input 
                      label="Base Hourly Rate (₹)" 
                      id="regRate" 
                      type="number" 
                      icon={DollarSign}
                      value={regRate}
                      onChange={(e) => setRegRate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      label="Max Hours/Week" 
                      id="regHours" 
                      type="number" 
                      icon={Clock}
                      value={regHours}
                      onChange={(e) => setRegHours(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit"
                  variant="primary"
                  className="w-full mt-2 bg-[#1e1a8a] hover:bg-[#1e1a8a]/90 text-white shadow-md py-3 text-base"
                  isLoading={loading}
                >
                  Create Account
                </Button>

                <div className="text-center mt-4">
                  <span className="text-sm text-on-surface-variant">Already have an account? </span>
                  <button 
                    type="button" 
                    onClick={() => { setError(''); setIsRegistering(false); }}
                    className="text-sm font-bold text-[#1e1a8a] hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        
        {/* Footer trust indicator */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center shrink-0">
          <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-3">Trusted by 200+ stores across India</p>
          <div className="flex gap-8 items-center justify-center text-sm font-bold text-outline-variant uppercase">
            <span>RELIANCE</span>
            <span>bb</span>
            <span className="lowercase font-serif italic">more.</span>
            <span>APOLLO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
