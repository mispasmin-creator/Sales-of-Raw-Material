import React, { useState } from 'react';
import { Sidebar } from './components/shared/Sidebar';
import { Header } from './components/shared/Header';
import { CommandPalette } from './components/shared/CommandPalette';
import { DocumentViewer } from './components/shared/DocumentViewer';

// View Modules
import { Dashboard } from './components/modules/Dashboard';
import { SaleOrders } from './components/modules/SaleOrders';
import { Logistics } from './components/modules/Logistics';
import { Invoices } from './components/modules/Invoices';
import SettingsModule from './components/modules/Settings';
import LoginModule from './components/modules/Login';

import { useApp, ROLES } from './context/AppContext';
import { hasPageAccess, canAccessTab } from './lib/utils';

function App() {
  const { activeTab, isAuthenticated, userRole } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginModule />;
  }

  const renderActiveModule = () => {
    console.log("FMS App Shell: Rendering Active Tab Module:", activeTab);
    if (!canAccessTab(activeTab, userRole)) {
      return <Dashboard />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return <SaleOrders />;
      case 'logistics':
        return <Logistics />;
      case 'invoices':
        return <Invoices />;
      case 'settings':
        return hasPageAccess(userRole, ROLES.ADMIN) ? <SettingsModule /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-navy-950 transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Container Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Sticky Header Bar */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Scrollable Dashboard Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-7xl">
            {renderActiveModule()}
          </div>
        </main>
      </div>

      {/* Global Command Palette search overlay (Ctrl+K) */}
      <CommandPalette />

      {/* Google Drive styled file viewer popup */}
      <DocumentViewer />

    </div>
  );
}

export default App;
