import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-4 border-b border-outline-variant flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-title-lg font-title-lg font-bold text-on-surface", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}
