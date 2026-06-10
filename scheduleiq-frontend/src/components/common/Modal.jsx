import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export function Modal({ isOpen, onClose, title, children, className }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // prevent background scrolling
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-scrim/40 backdrop-blur-sm transition-opacity"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      />
      
      {/* Modal Dialog */}
      <div 
        className={cn(
          "relative w-full max-w-lg bg-surface rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <h2 className="text-title-lg font-bold text-on-surface">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-on-surface-variant hover:text-on-surface">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
