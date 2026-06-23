import React from 'react';
import { cn } from '../../lib/utils';

export const Select = React.forwardRef(({ 
  className, 
  error,
  label,
  helperText,
  options = [],
  children,
  ...props 
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-slate-navy-700 dark:text-slate-navy-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          "flex w-full rounded-lg border border-slate-navy-200 bg-white px-3 py-2 text-sm text-slate-navy-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-navy-700 dark:bg-slate-navy-950 dark:text-slate-navy-100",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      >
        {children || options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
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

Select.displayName = 'Select';
