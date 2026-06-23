import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ 
  className, 
  type = 'text', 
  error,
  label,
  helperText,
  ...props 
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-slate-navy-700 dark:text-slate-navy-300">
          {label}
        </label>
      )}
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex w-full rounded-lg border border-slate-navy-200 bg-white px-3 py-2 text-sm text-slate-navy-900 placeholder:text-slate-navy-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-navy-700 dark:bg-slate-navy-950 dark:text-slate-navy-100 dark:placeholder:text-slate-navy-500",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 font-medium">
          {error.message || error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-xs text-slate-navy-400">
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
