import React, { createContext, useContext, useState, useEffect } from 'react';
import db from '../lib/db';

const AppContext = createContext();

export const ROLES = {
  ADMIN: 'Admin',
  SALES: 'Sales',
  LOGISTICS: 'Logistics',
  ACCOUNTS: 'Accounts'
};

const INITIAL_NOTIFICATIONS = [
  { id: 'n1', title: 'System Initialized', message: 'Welcome to Raw Material Sale FMS Dashboard.', type: 'info', read: false, time: '10m ago' },
  { id: 'n2', title: 'Security Alert', message: 'Row Level Security (RLS) is active on Database.', type: 'success', read: false, time: '1h ago' }
];

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUserVal] = useState(() => {
    const stored = localStorage.getItem('fms_current_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return { user_name: 'admin', role: 'Admin' };
  });

  const [userRole, setUserRole] = useState(() => {
    const stored = localStorage.getItem('fms_current_user');
    if (stored) {
      try {
        return JSON.parse(stored).role;
      } catch (e) {}
    }
    return localStorage.getItem('fms_user_role') || ROLES.ADMIN;
  });
  
  const [usersList, setUsersList] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('fms_is_authenticated') === 'true';
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(db.isSupabaseConnected());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('fms_sidebar_collapsed') === 'true';
  });

  const login = async (username, password) => {
    const uList = await db.getUsers();
    setUsersList(uList);

    const user = uList.find(
      u => u.user_name.toLowerCase() === username.trim().toLowerCase() && 
           u.password.trim() === password.trim()
    );

    if (user) {
      setIsAuthenticated(true);
      setCurrentUserVal(user);
      setUserRole(user.role);
      localStorage.setItem('fms_current_user', JSON.stringify(user));
      localStorage.setItem('fms_user_role', user.role);
      localStorage.setItem('fms_is_authenticated', 'true');
      addNotification('Access Granted', `Welcome back, ${user.user_name}!`, 'success');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('fms_is_authenticated');
    localStorage.removeItem('fms_current_user');
    addNotification('Logged Out', 'Safely terminated active session.', 'info');
  };

  const setCurrentUser = (user) => {
    setCurrentUserVal(user);
    setUserRole(user.role);
    localStorage.setItem('fms_current_user', JSON.stringify(user));
    localStorage.setItem('fms_user_role', user.role);
    addNotification('Switched User Profile', `Now logged in as ${user.user_name} (${user.role})`, 'success');
  };

  const fetchUsersList = async () => {
    try {
      const uList = await db.getUsers();
      setUsersList(uList);
      
      // Auto-validate current user existence
      if (uList.length > 0) {
        const exists = uList.find(u => u.user_name.toLowerCase() === currentUser.user_name.toLowerCase());
        if (!exists) {
          const adminUser = uList.find(u => u.role === ROLES.ADMIN) || uList[0];
          setCurrentUserVal(adminUser);
          setUserRole(adminUser.role);
          localStorage.setItem('fms_current_user', JSON.stringify(adminUser));
          localStorage.setItem('fms_user_role', adminUser.role);
        } else {
          // Sync role if updated
          if (exists.role !== currentUser.role) {
            setCurrentUserVal(exists);
            setUserRole(exists.role);
            localStorage.setItem('fms_current_user', JSON.stringify(exists));
            localStorage.setItem('fms_user_role', exists.role);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch users list in context", e);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  useEffect(() => {
    localStorage.setItem('fms_sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);
  
  // Google Drive Style Document Viewer State
  const [docViewer, setDocViewer] = useState({
    open: false,
    fileUrl: '',
    fileName: '',
    fileType: '', // 'PO', 'Bilty', 'Invoice'
    orderNo: ''
  });

  useEffect(() => {
    localStorage.setItem('fms_user_role', userRole);
    db.addLog(userRole, `Session role changed to ${userRole}`, {});
  }, [userRole]);

  const addNotification = (title, message, type = 'info') => {
    const newNotif = {
      id: `n_${Date.now()}`,
      title,
      message,
      type,
      read: false,
      time: 'Just now'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const openDocument = (fileUrl, fileName, fileType, orderNo) => {
    setDocViewer({
      open: true,
      fileUrl,
      fileName,
      fileType,
      orderNo
    });
  };

  const closeDocument = () => {
    setDocViewer(prev => ({ ...prev, open: false }));
  };

  const refreshSupabaseStatus = () => {
    setSupabaseConnected(db.isSupabaseConnected());
  };

  const checkPermission = (requiredRole) => {
    if (userRole === ROLES.ADMIN) return true;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }
    return userRole === requiredRole;
  };

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      currentUser,
      setCurrentUser,
      usersList,
      fetchUsersList,
      isAuthenticated,
      login,
      logout,
      activeTab,
      setActiveTab,
      notifications,
      addNotification,
      markAllNotificationsRead,
      clearNotifications,
      commandPaletteOpen,
      setCommandPaletteOpen,
      supabaseConnected,
      refreshSupabaseStatus,
      docViewer,
      openDocument,
      closeDocument,
      checkPermission,
      sidebarCollapsed,
      setSidebarCollapsed
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
export default AppContext;
