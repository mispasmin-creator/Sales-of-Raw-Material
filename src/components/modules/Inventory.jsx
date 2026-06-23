import React, { useState, useEffect } from 'react';
import { 
  Warehouse, 
  Search, 
  ArrowDownCircle, 
  AlertTriangle,
  History,
  Info
} from 'lucide-react';
import db from '../../lib/db';
import { cn, formatNumber } from '../../lib/utils';

export const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockLogs, setStockLogs] = useState([]);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [invList, logs] = await Promise.all([
        db.getInventory(),
        db.getLogs()
      ]);
      setInventory(invList);
      
      // Filter activity logs relating to inventory deductions or additions
      const invLogs = logs.filter(log => 
        log.action.includes('Inventory') || 
        log.action.includes('Product Created') || 
        log.action.includes('Product Updated')
      );
      setStockLogs(invLogs);
    } catch (e) {
      console.error("Failed to load inventory data", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Raw Material Stock Ledger
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Monitor real-time remaining quantities, total contract sales, and automatic inventory transactions.
          </p>
        </div>
      </div>

      {/* Quick alert banner if stock is running low */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {inventory.map(item => {
          const ratio = (item.remaining_qty / item.available_qty) * 100;
          const isLow = ratio < 20;
          if (!isLow) return null;
          return (
            <div key={item.product_id} className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Low Stock Alert: <strong>{item.product_name}</strong> is under 20% ({formatNumber(item.remaining_qty, 0)} {item.unit} left).</span>
            </div>
          );
        })}
      </div>

      {/* Filter and Search */}
      <div className="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-4.5 shadow-xs dark:bg-slate-navy-950 dark:border-slate-navy-900">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products in ledger..."
            className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-slate-navy-200 bg-white text-xs text-slate-navy-900 focus:border-brand-500 focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-100"
          />
        </div>
      </div>

      {/* Main Stock Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          
          {/* Main Inventory list */}
          <div className="glass-card rounded-xl border border-slate-100/50 overflow-hidden lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">Raw Material Product</th>
                    <th className="p-4 text-right">Available Qty (Initial)</th>
                    <th className="p-4 text-right">Sold Qty (Total)</th>
                    <th className="p-4 text-right">Remaining Qty (Current)</th>
                    <th className="p-4">Stock Levels</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50 dark:divide-slate-navy-900">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-navy-400">
                        No catalog items matching search query.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map(item => {
                      const ratio = (item.remaining_qty / item.available_qty) * 100;
                      return (
                        <tr key={item.product_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-navy-900/30">
                          <td className="p-4 font-bold text-slate-navy-850 dark:text-slate-navy-200">
                            {item.product_name}
                          </td>
                          <td className="p-4 text-right font-medium text-slate-navy-500">
                            {formatNumber(item.available_qty, 1)} {item.unit}
                          </td>
                          <td className="p-4 text-right font-semibold text-brand-650 dark:text-brand-400">
                            {formatNumber(item.sold_qty, 1)} {item.unit}
                          </td>
                          <td className="p-4 text-right font-extrabold text-slate-900 dark:text-white">
                            {formatNumber(item.remaining_qty, 1)} {item.unit}
                          </td>
                          <td className="p-4 w-44">
                            <div className="space-y-1">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden dark:bg-slate-navy-900">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    ratio < 20 ? "bg-red-500 animate-pulse" : ratio < 50 ? "bg-amber-500" : "bg-emerald-500"
                                  )}
                                  style={{ width: `${ratio}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-navy-450 font-bold block text-right">
                                {ratio.toFixed(0)}% Stock Left
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs side list */}
          <div className="glass-card rounded-xl border p-5 space-y-4">
            <h4 className="text-sm font-bold font-heading text-slate-navy-800 dark:text-slate-200 flex items-center gap-2 border-b pb-3 dark:border-slate-navy-800">
              <History className="h-4.5 w-4.5 text-brand-600" />
              Stock Operations Audit
            </h4>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {stockLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-navy-400">
                  No stock adjustments registered yet.
                </div>
              ) : (
                stockLogs.map(log => (
                  <div key={log.id} className="border-b pb-3 space-y-1 text-xs last:border-0 dark:border-slate-navy-800">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-navy-650 dark:bg-slate-navy-900 dark:text-slate-navy-300">
                        {log.user_role}
                      </span>
                      <span className="text-[9px] text-slate-navy-400 font-medium">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h5 className="font-semibold text-slate-navy-800 dark:text-slate-navy-200">
                      {log.action}
                    </h5>
                    {log.details && (
                      <p className="text-[9.5px] text-slate-navy-500 leading-normal">
                        {Object.keys(log.details).map(k => `${k}: ${log.details[k]}`).join(' | ')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Info footer */}
            <div className="rounded-lg bg-blue-50/50 p-3 border text-[10px] text-slate-navy-500 flex items-start gap-2 dark:bg-slate-navy-950/20 dark:border-slate-navy-850">
              <Info className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Stock is deducted dynamically when commercial invoices are generated. RLS enforces transactional database triggers.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
export default Inventory;
