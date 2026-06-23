import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export const Dialog = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className 
}) => {
  
  // Close on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent scrolling behind modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl",
    full: "max-w-full m-4 h-[calc(100vh-2rem)]"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={cn(
        "relative z-10 w-full rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in dark:bg-slate-navy-900 dark:border-slate-navy-800",
        sizes[size],
        size === 'full' ? '' : 'max-h-[90vh]',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-navy-800">
          <h3 className="text-lg font-semibold font-heading text-slate-navy-900 dark:text-slate-navy-100">
            {title}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-slate-navy-400 hover:text-slate-navy-700">
            <X className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
