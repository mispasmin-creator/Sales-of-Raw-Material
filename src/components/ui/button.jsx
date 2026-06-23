import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  loading = false,
  children,
  disabled,
  ...props 
}, ref) => {
  
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-98 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  
  const variants = {
    default: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm focus:ring-brand-500",
    secondary: "bg-slate-navy-100 text-slate-navy-900 hover:bg-slate-navy-200 dark:bg-slate-navy-800 dark:text-slate-navy-100 dark:hover:bg-slate-navy-700 focus:ring-slate-navy-500",
    outline: "border border-slate-navy-200 text-slate-navy-700 hover:bg-slate-navy-50 dark:border-slate-navy-700 dark:text-slate-navy-300 dark:hover:bg-slate-navy-900 focus:ring-slate-navy-500",
    ghost: "text-slate-navy-600 hover:bg-slate-navy-50 hover:text-slate-navy-900 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900 dark:hover:text-slate-navy-100",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    link: "text-brand-600 hover:underline p-0 focus:ring-0 active:scale-100"
  };

  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs rounded-md",
    lg: "px-6 py-3 text-base",
    icon: "h-9 w-9 p-0"
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
