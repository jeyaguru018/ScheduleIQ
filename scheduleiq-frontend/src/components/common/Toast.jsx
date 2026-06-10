import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl shadow-2xl flex items-start gap-3 border animate-in slide-in-from-bottom duration-300 ${
          toast.type === 'error' 
            ? 'bg-[#dc2626] text-white border-white/20' 
            : 'bg-[#14b8a6] text-white border-white/20'
        }`}>
          <div className="flex-1">
            <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-white/80 hover:text-white font-bold text-sm leading-none">✕</button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
