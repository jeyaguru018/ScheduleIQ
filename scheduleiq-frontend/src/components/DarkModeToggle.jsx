import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * DarkModeToggle — v2.0
 *
 * Persists user preference in localStorage under the key 'scheduleiq-theme'.
 * Applies/removes the `.dark` class on <html> to trigger Tailwind dark mode.
 * Respects the OS prefers-color-scheme on first load.
 */
export function DarkModeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(() => {
    // Priority: saved preference > OS preference
    const saved = localStorage.getItem('scheduleiq-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isAnimating, setIsAnimating] = useState(false);

  // Apply the theme class to <html> whenever isDark changes
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('scheduleiq-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsAnimating(true);
    setIsDark(prev => !prev);
    // Remove animation class after it finishes so it can re-trigger
    setTimeout(() => setIsAnimating(false), 450);
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative w-14 h-7 rounded-full transition-all duration-300 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        focus-visible:ring-offset-surface
        ${isDark
          ? 'bg-primary shadow-[0_0_12px_rgba(129,140,248,0.4)]'
          : 'bg-outline/30 hover:bg-outline/50'
        }
        ${className}
      `}
    >
      {/* Track background icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Moon className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-100 text-white' : 'opacity-0'}`} />
        <Sun  className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-60 text-on-surface-variant'}`} />
      </span>

      {/* Sliding knob */}
      <span
        className={`
          absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          shadow-3d-btn
          ${isDark
            ? 'translate-x-7 bg-white'
            : 'translate-x-0 bg-white'
          }
        `}
      >
        {/* Icon inside the knob that animates on toggle */}
        <span className={isAnimating ? 'animate-spin-once' : ''}>
          {isDark
            ? <Moon className="w-3 h-3 text-primary" />
            : <Sun  className="w-3 h-3 text-warning"  />
          }
        </span>
      </span>
    </button>
  );
}

/**
 * Hook to read/sync the current dark mode state from outside the toggle.
 * Useful for conditionally rendering dark-specific UI.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
