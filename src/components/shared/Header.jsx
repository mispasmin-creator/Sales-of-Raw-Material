import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Check, 
  Trash2,
  Lock
} from 'lucide-react';
import { useApp, ROLES } from '../../context/AppContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const Header = ({ onMenuClick }) => {
  const {
    userRole,
    setUserRole,
    currentUser,
    setCurrentUser,
    usersList,
    notifications,
    markAllNotificationsRead,
    clearNotifications,
    setCommandPaletteOpen
  } = useApp();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fms_theme') || 'light';
  });

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Toggle Dark/Light class on html element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fms_theme', theme);
  }, [theme]);

  // Click outside listener for notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white/70 px-6 backdrop-blur-md dark:border-slate-navy-800 dark:bg-slate-navy-950/70">
      
      {/* Left side: Menu toggle & Search bar trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-navy-500 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex h-9 w-60 items-center justify-between rounded-lg border border-slate-navy-100 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-navy-400 hover:bg-slate-100 dark:border-slate-navy-800 dark:bg-slate-navy-900/60 dark:hover:bg-slate-navy-900"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-navy-400" />
            Search everywhere...
          </span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950 sm:flex">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right side: Actions & User simulations */}
      <div className="flex items-center gap-3">
        


        {/* Theme Toggler */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="rounded-lg h-9 w-9 text-slate-navy-500 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        {/* Notifications Center */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative rounded-lg h-9 w-9 text-slate-navy-500 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-navy-950">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Notifications Dropdown menu */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-100 shadow-xl overflow-hidden animate-fade-in dark:bg-slate-navy-900 dark:border-slate-navy-800">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-navy-800">
                <span className="text-sm font-semibold font-heading text-slate-navy-800 dark:text-slate-navy-200">
                  System Alerts
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={markAllNotificationsRead}
                    title="Mark all as read"
                    className="text-slate-navy-400 hover:text-brand-600 dark:text-slate-navy-500"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={clearNotifications}
                    title="Clear notifications"
                    className="text-slate-navy-400 hover:text-red-500 dark:text-slate-navy-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-navy-400 font-medium">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id}
                      className={cn(
                        "border-b border-slate-50 p-4 transition-colors hover:bg-slate-50 dark:border-slate-navy-800 dark:hover:bg-slate-navy-900",
                        !notif.read && "bg-brand-50/20 dark:bg-brand-950/10"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-bold text-slate-navy-800 dark:text-slate-navy-200">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-navy-400 font-medium">
                          {notif.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-navy-500 dark:text-slate-navy-400 leading-normal">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-navy-800" />

        {/* User Profile Simulator Selector */}
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-slate-navy-400" />
          <select
            value={currentUser?.user_name || ''}
            onChange={(e) => {
              const selectedUserName = e.target.value;
              const selectedUser = usersList.find(u => u.user_name === selectedUserName);
              if (selectedUser) {
                setCurrentUser(selectedUser);
              }
            }}
            className="rounded-lg border border-slate-navy-200 bg-white px-2 py-1 text-xs font-semibold text-slate-navy-700 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-300"
          >
            {usersList.map(u => (
              <option key={u.user_name} value={u.user_name}>
                User: {u.user_name} ({u.role})
              </option>
            ))}
            {usersList.length === 0 && (
              <option value="admin">User: admin (Admin)</option>
            )}
          </select>
        </div>

      </div>
    </header>
  );
};
export default Header;
