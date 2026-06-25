import React from 'react';
import { LogOut, X } from 'lucide-react';

/**
 * ConfirmLogoutModal — a clear, accessible confirmation dialog before logging out.
 * Usage: <ConfirmLogoutModal isOpen={...} onConfirm={handleLogout} onCancel={() => setOpen(false)} />
 */
export function ConfirmLogoutModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        className="relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)'
        }}
      >
        {/* Close X */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5"
          style={{ boxShadow: 'inset 0 2px 4px rgba(239,68,68,0.15), 0 2px 8px rgba(239,68,68,0.1)' }}>
          <LogOut className="w-7 h-7 text-red-500" />
        </div>

        <h2 id="logout-dialog-title" className="text-xl font-extrabold text-gray-900 text-center mb-2">
          Sign out?
        </h2>
        <p className="text-sm text-gray-500 text-center mb-7 leading-relaxed">
          You'll need to sign in again to access your schedule and team data.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.06)' }}
          >
            Stay Signed In
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all"
            style={{ boxShadow: '0 4px 12px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
