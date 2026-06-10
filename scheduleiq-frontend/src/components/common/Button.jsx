import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  isLoading,
  icon: Icon,
  disabled,
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-label-md font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container focus:ring-primary shadow-sm",
    secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary focus:ring-secondary",
    outline: "border border-outline text-primary hover:bg-surface-variant focus:ring-primary",
    ghost: "bg-transparent text-primary hover:bg-surface-variant focus:ring-primary",
    danger: "bg-error text-on-error hover:bg-error-container hover:text-on-error-container focus:ring-error shadow-sm",
    dangerGhost: "bg-transparent text-error hover:bg-error-container hover:text-on-error-container focus:ring-error",
    success: "bg-success text-white hover:bg-success/90 focus:ring-success shadow-sm",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && Icon && <Icon className={cn("h-4 w-4", children ? "mr-2" : "")} />}
      {children}
    </button>
  );
}
