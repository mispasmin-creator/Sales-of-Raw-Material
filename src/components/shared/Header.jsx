import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
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
    clearNotifications
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
      
      {/* Left side: Menu toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-navy-500 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
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
        {/* Divider */}
        {/* <div className="h-6 w-px bg-slate-200 dark:bg-slate-navy-800" /> */}

        {/* User Profile Simulator Selector */}
        {/* <div className="flex items-center gap-1.5">
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
        </div> */}

      </div>
    </header>
  );
};
export default Header;
