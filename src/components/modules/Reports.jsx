import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Search, 
  FileDown, 
  Printer, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  Activity,
  Boxes,
  Truck,
  ReceiptText,
  AlertTriangle
} from 'lucide-react';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { useApp } from '../../context/AppContext';
import { cn, formatCurrency, formatNumber, exportToCSV, printDocument } from '../../lib/utils';

export const Reports = () => {
  const { openDocument } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState('sales'); // 'sales' | 'logistics' | 'invoice' | 'delay' | 'product'
  
  // Primary datasets
  const [orders, setOrders] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderList, logsList, invsList, partyList, prodList] = await Promise.all([
        db.getOrders(),
        db.getLogistics(),
        db.getInvoices(),
        db.getParties(),
        db.getProducts()
      ]);

      setOrders(orderList);
      setLogistics(logsList);
      setInvoices(invsList);
      setParties(partyList);
      setProducts(prodList);
    } catch (e) {
      console.error("Failed to load reports analytical datasets", e);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterParty('');
    setFilterProduct('');
    setFilterStatus('');
  };

  // Helper: check date bounds
  const checkDateInBounds = (dateStr, start, end) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0,0,0,0);
    
    if (start) {
      const s = new Date(start);
      s.setHours(0,0,0,0);
      if (date < s) return false;
    }
    if (end) {
      const e = new Date(end);
      e.setHours(0,0,0,0);
      if (date > e) return false;
    }
    return true;
  };

  // --- Filtering Logic ---
  const getFilteredSales = () => {
    return orders.filter(o => {
      if (filterParty && o.party_id !== filterParty) return false;
      if (filterProduct && o.product_id !== filterProduct) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if ((filterStartDate || filterEndDate) && !checkDateInBounds(o.created_at, filterStartDate, filterEndDate)) return false;
      return true;
    });
  };

  const getFilteredLogistics = () => {
    return logistics.filter(l => {
      // Find corresponding order to check filters
      const ord = orders.find(o => o.id === l.order_id);
      if (!ord) return false;
      if (filterParty && ord.party_id !== filterParty) return false;
      if (filterProduct && ord.product_id !== filterProduct) return false;
      if ((filterStartDate || filterEndDate) && !checkDateInBounds(l.created_at, filterStartDate, filterEndDate)) return false;
      return true;
    });
  };

  const getFilteredInvoices = () => {
    return invoices.filter(inv => {
      const ord = orders.find(o => o.id === inv.order_id);
      if (!ord) return false;
      if (filterParty && ord.party_id !== filterParty) return false;
      if (filterProduct && ord.product_id !== filterProduct) return false;
      if ((filterStartDate || filterEndDate) && !checkDateInBounds(inv.created_at, filterStartDate, filterEndDate)) return false;
      return true;
    });
  };

  const getFilteredDelays = () => {
    // Show orders that have logistics or invoices registered to check delay
    return orders.filter(o => {
      if (filterParty && o.party_id !== filterParty) return false;
      if (filterProduct && o.product_id !== filterProduct) return false;
      if ((filterStartDate || filterEndDate) && !checkDateInBounds(o.created_at, filterStartDate, filterEndDate)) return false;
      return true;
    });
  };

  const getProductWiseSales = () => {
    // Group totals by product type
    const productTotals = {};
    
    // Seed all products
    products.forEach(p => {
      productTotals[p.id] = {
        name: p.name,
        ordersCount: 0,
        qtyMT: 0,
        revenue: 0,
        unit: p.unit
      };
    });

    const filtered = orders.filter(o => {
      if (filterParty && o.party_id !== filterParty) return false;
      if (filterProduct && o.product_id !== filterProduct) return false;
      if ((filterStartDate || filterEndDate) && !checkDateInBounds(o.created_at, filterStartDate, filterEndDate)) return false;
      return true;
    });

    filtered.forEach(o => {
      if (productTotals[o.product_id]) {
        productTotals[o.product_id].ordersCount += 1;
        if (o.status === 'Completed') {
          productTotals[o.product_id].qtyMT += parseFloat(o.qty) || 0;
          productTotals[o.product_id].revenue += parseFloat(o.amount) || 0;
        }
      }
    });

    return Object.values(productTotals);
  };

  // Helper: Calculate delay days between two date strings
  const getDelayDays = (plannedStr, actualStr, graceDays = 0) => {
    if (!plannedStr || !actualStr) return 0;
    const planned = new Date(plannedStr);
    planned.setDate(planned.getDate() + graceDays);
    const actual = new Date(actualStr);
    
    planned.setHours(0,0,0,0);
    actual.setHours(0,0,0,0);

    const diff = actual.getTime() - planned.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // --- Export Actions ---
  const handleExportExcel = () => {
    if (activeReportTab === 'sales') {
      const data = getFilteredSales();
      const headers = { order_no: 'Order No', party_name: 'Customer Name', product_name: 'Product Name', qty: 'Quantity (MT)', rate: 'Rate (INR)', amount: 'Taxable Amount', transport_type: 'Transport Type', dispatch_date: 'Dispatch Date', status: 'Status' };
      exportToCSV(data, headers, 'Sales_Report');
    } else if (activeReportTab === 'logistics') {
      const data = getFilteredLogistics();
      const headers = { order_no: 'Order No', transporter_name: 'Transporter Name', truck_no: 'Truck No', bilty_no: 'Bilty No', actual_truck_qty: 'Loaded Qty (MT)', rate_type: 'Rate Term', rate_value: 'Freight Rate', freight_amount: 'Freight Amount' };
      exportToCSV(data, headers, 'Logistics_Report');
    } else if (activeReportTab === 'invoice') {
      const data = getFilteredInvoices().map(inv => {
        const ord = orders.find(o => o.id === inv.order_id);
        return {
          ...inv,
          customer: ord?.party_name || '',
          value: ord?.amount || 0
        };
      });
      const headers = { invoice_no: 'Invoice Number', order_no: 'Order No', customer: 'Customer Name', value: 'Taxable Base', created_at: 'Invoice Date' };
      exportToCSV(data, headers, 'Invoices_Report');
    } else if (activeReportTab === 'delay') {
      const data = getFilteredDelays().map(o => {
        const log = logistics.find(l => l.order_id === o.id);
        const inv = invoices.find(i => i.order_id === o.id);
        const logDelay = log ? getDelayDays(o.dispatch_date, log.created_at) : 0;
        const invDelay = inv ? getDelayDays(o.dispatch_date, inv.created_at, 2) : 0;
        return {
          order_no: o.order_no,
          party: o.party_name,
          planned_dispatch: o.dispatch_date,
          actual_dispatch: log ? new Date(log.created_at).toISOString().split('T')[0] : 'Pending',
          dispatch_delay: logDelay,
          actual_invoice: inv ? new Date(inv.created_at).toISOString().split('T')[0] : 'Pending',
          invoice_delay: invDelay
        };
      });
      const headers = { order_no: 'Order No', party: 'Customer Name', planned_dispatch: 'Planned Dispatch', actual_dispatch: 'Actual Dispatch', dispatch_delay: 'Dispatch Delay (Days)', actual_invoice: 'Actual Invoice', invoice_delay: 'Invoice Delay (Days)' };
      exportToCSV(data, headers, 'Delay_Analysis');
    } else if (activeReportTab === 'product') {
      const data = getProductWiseSales();
      const headers = { name: 'Product Category', ordersCount: 'Total Orders Registered', qtyMT: 'Completed Qty (MT)', revenue: 'Accumulated Revenues (INR)' };
      exportToCSV(data, headers, 'Product_Wise_Sales');
    }
  };

  const handlePrintPDF = () => {
    printDocument('printable-report-area', `${activeReportTab.toUpperCase()}_Report`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Enterprise Reports & Auditing
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Generate printable tax sheets, delay analytics, product turnovers, and audit dispatches.
          </p>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV / Excel
          </Button>
          <Button onClick={handlePrintPDF} variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Printer className="h-4 w-4 text-blue-600" />
            Print Report PDF
          </Button>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="glass-card rounded-xl border p-4.5 space-y-4 no-print">
        <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-navy-800">
          <h4 className="text-xs font-bold font-heading text-slate-navy-700 dark:text-slate-navy-300 flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-brand-600" />
            Analytical Multi-Filters
          </h4>
          <button onClick={clearFilters} className="text-[10px] text-brand-650 hover:underline font-bold">
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <Input
            label="From Date"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
          
          <Select
            label="Party Name"
            value={filterParty}
            onChange={(e) => setFilterParty(e.target.value)}
          >
            <option value="">-- All Parties --</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select
            label="Product Name"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
          >
            <option value="">-- All Products --</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select
            label="Order Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            disabled={activeReportTab !== 'sales'} // only applies to sales report
          >
            <option value="">-- All Statuses --</option>
            <option value="Pending Logistics">Pending Logistics</option>
            <option value="Pending Invoice">Pending Invoice</option>
            <option value="Completed">Completed</option>
          </Select>
        </div>
      </div>

      {/* Reports navigation sub-tabs */}
      <div className="flex border-b border-slate-100 pb-1.5 gap-2 no-print dark:border-slate-navy-800">
        {[
          { id: 'sales', label: 'Sales Report', icon: FileText },
          { id: 'logistics', label: 'Logistics Report', icon: Truck },
          { id: 'invoice', label: 'Invoice Ledger', icon: ReceiptText },
          { id: 'delay', label: 'Delay Analysis', icon: Activity },
          { id: 'product', label: 'Product Turnover', icon: Boxes }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                isActive 
                  ? "bg-slate-navy-100 text-slate-navy-900 dark:bg-slate-navy-800 dark:text-slate-navy-100"
                  : "text-slate-navy-500 hover:bg-slate-50 dark:hover:bg-slate-navy-900"
              )}
            >
              <Icon className="h-4 w-4 text-slate-navy-450" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* printable container wrapper */}
      <div id="printable-report-area" className="print-page bg-white rounded-xl border border-slate-100 shadow-xs dark:bg-slate-navy-950 dark:border-slate-navy-900">
        
        {/* Printable-only Header */}
        <div className="hidden print:block pb-6 mb-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">Sale Of Raw Material FMS</h1>
              <p className="text-[10px] text-slate-500">Corporate Audit Report | Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold uppercase text-slate-700">{activeReportTab} Registry</h3>
              <p className="text-[10px] text-slate-500">Filters: Date range ({filterStartDate || 'All'} - {filterEndDate || 'All'})</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center no-print">
            <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            
            {/* 1. SALES REPORT TABLE */}
            {activeReportTab === 'sales' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900/50 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">Order No</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Raw Material Category</th>
                    <th className="p-4 text-right">Tonnage Qty</th>
                    <th className="p-4 text-right">Order Rate</th>
                    <th className="p-4 text-right">Taxable Amount</th>
                    <th className="p-4">Transport Type</th>
                    <th className="p-4">Dispatch Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-navy-900">
                  {getFilteredSales().length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-navy-450">No sales transactions match the filtered criteria.</td>
                    </tr>
                  ) : (
                    getFilteredSales().map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-navy-900/10">
                        <td className="p-4 font-bold text-slate-navy-800 dark:text-white">{o.order_no}</td>
                        <td className="p-4 font-semibold text-slate-navy-800 dark:text-slate-navy-200">{o.party_name}</td>
                        <td className="p-4 text-slate-navy-500 font-medium">{o.product_name}</td>
                        <td className="p-4 text-right font-semibold text-slate-800 dark:text-slate-200">{formatNumber(o.qty, 1)} MT</td>
                        <td className="p-4 text-right text-slate-navy-500">{formatCurrency(o.rate)}</td>
                        <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(o.amount)}</td>
                        <td className="p-4 font-medium text-slate-navy-500">{o.transport_type}</td>
                        <td className="p-4 font-medium text-slate-navy-500">{new Date(o.dispatch_date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                            o.status === 'Completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                          )}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. LOGISTICS REPORT TABLE */}
            {activeReportTab === 'logistics' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900/50 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">Order No</th>
                    <th className="p-4">Transporter Company</th>
                    <th className="p-4">Truck Registration</th>
                    <th className="p-4">Bilty Slip No</th>
                    <th className="p-4 text-right">Loaded weight (MT)</th>
                    <th className="p-4">Rate Basis</th>
                    <th className="p-4 text-right">Freight Rate</th>
                    <th className="p-4 text-right">Grand Freight Cost</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-navy-900">
                  {getFilteredLogistics().length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-navy-450">No dispatches registered under logistics for filtered range.</td>
                    </tr>
                  ) : (
                    getFilteredLogistics().map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-navy-900/10">
                        <td className="p-4 font-bold text-slate-navy-850 dark:text-white">{l.order_no}</td>
                        <td className="p-4 font-semibold text-slate-navy-800 dark:text-slate-navy-200">{l.transporter_name}</td>
                        <td className="p-4 font-semibold font-mono text-[10.5px] text-slate-navy-650 dark:text-slate-navy-300">{l.truck_no}</td>
                        <td className="p-4 font-semibold text-slate-navy-800 dark:text-slate-navy-200">{l.bilty_no}</td>
                        <td className="p-4 text-right font-semibold text-slate-800 dark:text-slate-200">{formatNumber(l.actual_truck_qty, 1)} MT</td>
                        <td className="p-4 font-medium text-slate-navy-500">{l.rate_type}</td>
                        <td className="p-4 text-right text-slate-navy-500">{formatCurrency(l.rate_value)}</td>
                        <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(l.freight_amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. INVOICE REPORT TABLE */}
            {activeReportTab === 'invoice' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900/50 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">Invoice Number</th>
                    <th className="p-4">Order Ref No</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4 text-right">Taxable Value</th>
                    <th className="p-4 text-right">IGST (18%)</th>
                    <th className="p-4 text-right">Grand Total Payable</th>
                    <th className="p-4">Settlement Date</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-navy-900">
                  {getFilteredInvoices().length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-navy-450">No invoicing records cleared under filtered criteria.</td>
                    </tr>
                  ) : (
                    getFilteredInvoices().map(inv => {
                      const ord = orders.find(o => o.id === inv.order_id);
                      const base = ord?.amount || 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-navy-900/10">
                          <td className="p-4 font-extrabold text-brand-700 dark:text-brand-400">{inv.invoice_no}</td>
                          <td className="p-4 font-bold text-slate-navy-850 dark:text-slate-navy-200">{inv.order_no}</td>
                          <td className="p-4 font-semibold text-slate-navy-850 dark:text-slate-navy-200">{ord?.party_name}</td>
                          <td className="p-4 text-right font-medium text-slate-navy-500">{formatCurrency(base)}</td>
                          <td className="p-4 text-right text-slate-navy-500">{formatCurrency(base * 0.18)}</td>
                          <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(base * 1.18)}</td>
                          <td className="p-4 text-slate-navy-500 font-medium">{new Date(inv.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 4. DELAY ANALYSIS TABLE */}
            {activeReportTab === 'delay' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900/50 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">Order No</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4 font-medium">Target dispatch</th>
                    <th className="p-4 font-medium">Actual Dispatch</th>
                    <th className="p-4 text-right">Dispatch Delay</th>
                    <th className="p-4 font-medium">Target Invoiced</th>
                    <th className="p-4 font-medium">Actual Invoiced</th>
                    <th className="p-4 text-right">Invoice Delay</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-navy-900">
                  {getFilteredDelays().length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-navy-450">No active dispatches completed date targets.</td>
                    </tr>
                  ) : (
                    getFilteredDelays().map(o => {
                      const log = logistics.find(l => l.order_id === o.id);
                      const inv = invoices.find(i => i.order_id === o.id);
                      
                      const logDelay = log ? getDelayDays(o.dispatch_date, log.created_at) : 0;
                      // Invoicing planned target has a 2 days grace period post dispatch date
                      const invDelay = inv ? getDelayDays(o.dispatch_date, inv.created_at, 2) : 0;

                      let logColor = 'text-emerald-650';
                      if (logDelay > 2) logColor = 'text-red-650 font-bold';
                      else if (logDelay > 0) logColor = 'text-amber-600 font-bold';

                      let invColor = 'text-emerald-650';
                      if (invDelay > 2) invColor = 'text-red-650 font-bold';
                      else if (invDelay > 0) invColor = 'text-amber-600 font-bold';

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-navy-900/10">
                          <td className="p-4 font-bold text-slate-navy-850 dark:text-white">{o.order_no}</td>
                          <td className="p-4 font-semibold text-slate-navy-850 dark:text-slate-navy-200">{o.party_name}</td>
                          <td className="p-4 text-slate-navy-500 font-medium">{new Date(o.dispatch_date).toLocaleDateString()}</td>
                          <td className="p-4 text-slate-navy-500 font-medium">
                            {log ? new Date(log.created_at).toLocaleDateString() : <span className="italic text-slate-navy-400">Pending</span>}
                          </td>
                          <td className={cn("p-4 text-right", logColor)}>
                            {log ? (logDelay === 0 ? 'On Time' : `${logDelay} Days`) : '-'}
                          </td>
                          <td className="p-4 text-slate-navy-500 font-medium">
                            {(() => {
                              const d = new Date(o.dispatch_date);
                              d.setDate(d.getDate() + 2);
                              return d.toLocaleDateString();
                            })()}
                          </td>
                          <td className="p-4 text-slate-navy-500 font-medium">
                            {inv ? new Date(inv.created_at).toLocaleDateString() : <span className="italic text-slate-navy-400">Pending</span>}
                          </td>
                          <td className={cn("p-4 text-right", invColor)}>
                            {inv ? (invDelay === 0 ? 'On Time' : `${invDelay} Days`) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 5. PRODUCT WISE SALES TABLE */}
            {activeReportTab === 'product' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900/50 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">Product Category Description</th>
                    <th className="p-4 text-center">Total Orders Registered</th>
                    <th className="p-4 text-right">Completed Sales Tonnage</th>
                    <th className="p-4 text-right">Accumulated Revenue Turnover</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-navy-900">
                  {getProductWiseSales().map(prod => (
                    <tr key={prod.name} className="hover:bg-slate-50/20 dark:hover:bg-slate-navy-900/10">
                      <td className="p-4 font-bold text-slate-navy-850 dark:text-white">{prod.name}</td>
                      <td className="p-4 text-center font-semibold text-slate-navy-500">{prod.ordersCount}</td>
                      <td className="p-4 text-right font-extrabold text-slate-800 dark:text-slate-200">
                        {formatNumber(prod.qtyMT, 1)} {prod.unit}
                      </td>
                      <td className="p-4 text-right font-extrabold text-brand-650 dark:text-brand-400">
                        {formatCurrency(prod.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        )}

      </div>

    </div>
  );
};
export default Reports;
