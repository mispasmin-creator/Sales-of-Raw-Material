import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  FileText, 
  Truck, 
  ReceiptText, 
  Route, 
  Warehouse, 
  BarChart3, 
  Settings as SettingsIcon,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useApp, ROLES } from '../../context/AppContext';
import { cn } from '../../lib/utils';

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const { activeTab, setActiveTab, userRole, currentUser, logout, sidebarCollapsed, setSidebarCollapsed } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [ROLES.ADMIN, ROLES.SALES, ROLES.LOGISTICS, ROLES.ACCOUNTS] },
    { id: 'sales', label: 'Sale Orders', icon: FileText, roles: [ROLES.ADMIN, ROLES.SALES] },
    { id: 'logistics', label: 'Logistics', icon: Truck, roles: [ROLES.ADMIN, ROLES.LOGISTICS] },
    { id: 'invoices', label: 'Invoices', icon: ReceiptText, roles: [ROLES.ADMIN, ROLES.ACCOUNTS] },
    { id: 'settings', label: 'User Management', icon: SettingsIcon, roles: [ROLES.ADMIN, ROLES.SALES, ROLES.LOGISTICS, ROLES.ACCOUNTS] }
  ];

  // Filter menu based on user role permissions
  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  const handleNav = (tabId) => {
    console.log("FMS Sidebar: Navigation Clicked for Tab:", tabId);
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-100 bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out dark:border-slate-navy-800 dark:bg-slate-navy-950/95 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 relative",
        sidebarCollapsed ? "w-64 lg:w-20" : "w-64 lg:w-64",
        isOpen ? "translate-x-0" : "-translate-x-0 max-lg:-translate-x-full"
      )}>
        
        {/* Collapsible Chevron Arrow for desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-navy-600 shadow-md hover:bg-slate-50 dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-300 hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Header Branding */}
        <div className={cn("flex h-16 items-center border-b border-slate-100 px-6 dark:border-slate-navy-800 transition-all", sidebarCollapsed ? "justify-center px-2" : "justify-between")}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-transparent overflow-hidden">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div className={cn("transition-all duration-300", sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
              <h1 className="text-base font-bold font-heading text-slate-navy-900 dark:text-white leading-tight truncate">
                Raw Material
              </h1>
              <p className="text-[10px] font-semibold tracking-wider text-brand-600 uppercase truncate">
                FMS Enterprise
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className={cn("rounded-lg p-1 text-slate-navy-400 hover:bg-slate-50 dark:hover:bg-slate-navy-900 lg:hidden", sidebarCollapsed && "hidden")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>



        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {filteredMenu.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg py-3 text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/10" 
                    : "text-slate-navy-600 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900",
                  sidebarCollapsed ? "justify-center px-2" : "px-4"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-105 shrink-0",
                  isActive ? "text-white" : "text-slate-navy-400 group-hover:text-slate-navy-600 dark:group-hover:text-slate-navy-200"
                )} />
                <span className={cn("transition-all duration-300 truncate", sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Card Display with Logout (At the bottom) */}
        <div className={cn("m-4 mt-auto rounded-xl bg-slate-50 border border-slate-100/50 dark:bg-slate-navy-900 dark:border-slate-navy-800/50 transition-all duration-300", sidebarCollapsed ? "p-2 m-2" : "p-3.5")}>
          <div className="flex items-center gap-2.5 justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold uppercase text-xs border border-brand-200">
                {currentUser?.user_name ? currentUser.user_name[0] : userRole[0]}
              </div>
              <div className={cn("overflow-hidden transition-all duration-300 min-w-0 text-left", sidebarCollapsed ? "opacity-0 w-0 h-0" : "opacity-100 w-auto")}>
                <p className="text-[9px] text-slate-navy-400 font-bold uppercase tracking-wider leading-none">Logged in</p>
                <h4 className="text-xs font-bold text-slate-navy-850 dark:text-slate-navy-200 truncate mt-0.5" title={currentUser?.user_name || 'admin'}>
                  {currentUser?.user_name || 'admin'}
                </h4>
                <span className="inline-flex mt-0.5 items-center rounded-full bg-brand-100 px-2 py-0.25 text-[9px] font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-300 border border-brand-200 leading-none">
                  {userRole}
                </span>
              </div>
            </div>
            
            {/* Logout Button */}
            {!sidebarCollapsed && (
              <button
                onClick={() => {
                  if (confirm("Kya aap logout karna chahte hain?")) {
                    logout();
                    setActiveTab('dashboard');
                  }
                }}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-navy-800 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Collapse Mode Logout trigger */}
          {sidebarCollapsed && (
            <button
              onClick={() => {
                if (confirm("Kya aap logout karna chahte hain?")) {
                  logout();
                  setActiveTab('dashboard');
                }
              }}
              title="Logout"
              className="mt-2 w-full flex items-center justify-center p-1 rounded-md text-slate-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-navy-850 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 p-4 text-center dark:border-slate-navy-800">
          <p className="text-[11px] text-slate-navy-400 font-semibold truncate">
            {sidebarCollapsed ? 'FMS' : 'FMS Version 2.4.0 (Stable)'}
          </p>
        </div>
      </aside>
    </>
  );
};
