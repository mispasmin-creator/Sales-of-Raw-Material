import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  User, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Settings,
  Route,
  Warehouse
} from 'lucide-react';
import { useApp, ROLES } from '../../context/AppContext';
import db from '../../lib/db';
import { cn, filterByFirmAccess, canAccessTab, hasPageAccess } from '../../lib/utils';

export const CommandPalette = () => {
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    setActiveTab, 
    setUserRole,
    openDocument,
    currentUser,
    userRole
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [dbData, setDbData] = useState({ orders: [], products: [], parties: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Key listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      loadSearchData();
    }
  }, [commandPaletteOpen]);

  // Fetch searchable records
  const loadSearchData = async () => {
    try {
      const [orders, products, parties] = await Promise.all([
        db.getOrders(),
        db.getProducts(),
        db.getParties()
      ]);
      setDbData({ orders: filterByFirmAccess(orders, currentUser), products, parties });
    } catch (e) {
      console.error("Failed to load command palette search data", e);
    }
  };

  // Perform search matching
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const queryTrim = query.trim().toLowerCase();
    
    // Default commands list when query is empty
    if (!queryTrim) {
      const defaultResults = [
        { type: 'navigation', label: 'Go to Dashboard', icon: Layers, action: () => setActiveTab('dashboard') },
        ...(canAccessTab('sales', userRole)
          ? [{ type: 'navigation', label: 'Go to Sale Orders', icon: FileText, action: () => setActiveTab('sales') }]
          : []),
        ...(hasPageAccess(userRole, ROLES.ADMIN)
          ? [
              { type: 'action', label: 'Simulate Sales Role', icon: User, action: () => setUserRole(ROLES.SALES) },
              { type: 'action', label: 'Simulate Logistics Role', icon: User, action: () => setUserRole(ROLES.LOGISTICS) },
              { type: 'action', label: 'Simulate Accounts Role', icon: User, action: () => setUserRole(ROLES.ACCOUNTS) }
            ]
          : [])
      ];
      setResults(defaultResults);
      return;
    }

    const filtered = [];

    // Match Pages
    const pages = [
      { id: 'dashboard', label: 'Dashboard Page', tab: 'dashboard', icon: Layers },
      { id: 'sales', label: 'Sale Order Registry', tab: 'sales', icon: FileText },
      { id: 'logistics', label: 'Logistics Control Desk', tab: 'logistics', icon: Settings },
      { id: 'invoices', label: 'Invoice Ledger', tab: 'invoices', icon: FileText },
      { id: 'settings', label: 'Database Credentials Settings', tab: 'settings', icon: Settings }
    ];

    pages.forEach(p => {
      if (canAccessTab(p.tab, userRole) && p.label.toLowerCase().includes(queryTrim)) {
        filtered.push({
          type: 'navigation',
          label: `Navigate: ${p.label}`,
          icon: p.icon,
          action: () => setActiveTab(p.tab)
        });
      }
    });

    // Match Orders
    dbData.orders.forEach(o => {
      if (
        o.order_no.toLowerCase().includes(queryTrim) ||
        o.party_name.toLowerCase().includes(queryTrim) ||
        o.product_name.toLowerCase().includes(queryTrim) ||
        o.status.toLowerCase().includes(queryTrim)
      ) {
        filtered.push({
          type: 'order',
          label: `Order: ${o.order_no} - ${o.party_name} (${o.product_name})`,
          subtext: `Qty: ${o.qty} | Status: ${o.status}`,
          icon: FileText,
          action: () => {
            setActiveTab('sales');
          }
        });
      }
    });

    // Match Products
    dbData.products.forEach(p => {
      if (p.name.toLowerCase().includes(queryTrim)) {
        filtered.push({
          type: 'master',
          label: `Product: ${p.name}`,
          subtext: `Stock: ${p.available_qty} ${p.unit}`,
          icon: Warehouse,
          action: () => setActiveTab('sales')
        });
      }
    });

    // Match Parties
    dbData.parties.forEach(pt => {
      if (pt.name.toLowerCase().includes(queryTrim)) {
        filtered.push({
          type: 'master',
          label: `Party: ${pt.name}`,
          subtext: 'Party Directory Record',
          icon: User,
          action: () => setActiveTab('sales')
        });
      }
    });

    // Match simulated Actions
    const actions = [
      { trigger: 'create order', label: 'Create New Sale Order Draft', action: () => setActiveTab('sales') },
      { trigger: 'logistics', label: 'Manage Transport & Bilty Details', action: () => setActiveTab('logistics') },
      { trigger: 'invoice', label: 'Accounts: Generate Invoice Number', action: () => setActiveTab('invoices') },
      ...(hasPageAccess(userRole, ROLES.ADMIN)
        ? [
            { trigger: 'admin', label: 'Promote privileges to Admin Role', action: () => setUserRole(ROLES.ADMIN) },
            { trigger: 'reset', label: 'System Database Factory Reset', action: () => {
              if(confirm("Confirm database factory reset? All localStorage data will be wiped.")) {
                db.reset();
                window.location.reload();
              }
            }}
          ]
        : [])
    ].filter(action => {
      if (action.trigger === 'create order') return canAccessTab('sales', userRole);
      if (action.trigger === 'logistics') return canAccessTab('logistics', userRole);
      if (action.trigger === 'invoice') return canAccessTab('invoices', userRole);
      return true;
    });

    actions.forEach(act => {
      if (act.trigger.includes(queryTrim) || act.label.toLowerCase().includes(queryTrim)) {
        filtered.push({
          type: 'action',
          label: `Action: ${act.label}`,
          icon: ShieldAlert,
          action: act.action
        });
      }
    });

    setResults(filtered.slice(0, 10)); // Limit to top 10 matches
    setSelectedIndex(0);
  }, [query, dbData, commandPaletteOpen]);

  const handleSelect = (index) => {
    const item = results[index];
    if (item) {
      item.action();
      setCommandPaletteOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh] no-print">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Main command container */}
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-slate-100 bg-white/95 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-fade-in dark:border-slate-navy-800 dark:bg-slate-navy-950/95">
        
        {/* Search Input bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-navy-800">
          <Search className="h-5 w-5 text-slate-navy-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search orders, products, parties, or type commands..."
            className="flex-1 bg-transparent text-sm text-slate-navy-900 placeholder:text-slate-navy-400 focus:outline-none dark:text-slate-navy-100 dark:placeholder:text-slate-navy-500"
          />
          <kbd className="pointer-events-none rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2" ref={resultsRef}>
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-navy-400 font-medium">
              No matching commands or database records found.
            </div>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={index}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3.5 py-2.5 cursor-pointer transition-all",
                    isSelected 
                      ? "bg-brand-600 text-white" 
                      : "text-slate-navy-700 dark:text-slate-navy-300 hover:bg-slate-50 dark:hover:bg-slate-navy-900/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4.5 w-4.5", isSelected ? "text-white" : "text-slate-navy-400")} />
                    <div>
                      <p className="text-xs font-bold leading-normal">
                        {item.label}
                      </p>
                      {item.subtext && (
                        <p className={cn("text-[10px] mt-0.5 font-medium", isSelected ? "text-brand-100" : "text-slate-navy-400")}>
                          {item.subtext}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && <ArrowRight className="h-3.5 w-3.5 text-white" />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[10px] text-slate-navy-400 dark:border-slate-navy-800 dark:bg-slate-navy-900/20">
          <div className="flex gap-3">
            <span>↑↓ Navigation</span>
            <span>Enter Select</span>
          </div>
          <span>Shortcut search anywhere in app</span>
        </div>

      </div>
    </div>
  );
};
export default CommandPalette;
