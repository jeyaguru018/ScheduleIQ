import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(({ className, label, error, icon: Icon, iconClassName, id, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-label-md font-label-md text-on-surface font-semibold mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={cn("h-5 w-5 text-outline", iconClassName)} />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-md border border-on-surface/50 bg-surface px-3 py-2 text-body-md text-on-surface font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-sm",
            Icon && "pl-10",
            error && "border-error focus-visible:ring-error focus-visible:border-error",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-label-sm text-error font-medium">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
