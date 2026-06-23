import React, { useState, useEffect } from 'react';
import { 
  Route, 
  Search, 
  FileText, 
  Truck, 
  ReceiptText, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

export const Tracking = () => {
  const { openDocument } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [logisticsDetails, setLogisticsDetails] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const list = await db.getOrders();
      setOrders(list);

      // Check if command palette requested a specific order preselection
      const preselectNo = localStorage.getItem('fms_track_preselect');
      if (preselectNo) {
        const found = list.find(o => o.order_no === preselectNo);
        if (found) {
          handleSelectOrder(found);
        }
        localStorage.removeItem('fms_track_preselect');
      } else if (list.length > 0) {
        // Default select first order
        handleSelectOrder(list[0]);
      }
    } catch (e) {
      console.error("Failed to load tracking list", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setLogisticsDetails(null);
    setInvoiceDetails(null);

    try {
      const [logsList, invsList] = await Promise.all([
        db.getLogistics(),
        db.getInvoices()
      ]);

      const log = logsList.find(l => l.order_id === order.id);
      const inv = invsList.find(i => i.order_id === order.id);

      setLogisticsDetails(log || null);
      setInvoiceDetails(inv || null);
    } catch (e) {
      console.error("Failed to load timeline details", e);
    }
  };

  // Helper: Calculate delay days between two date strings
  const getDelayInfo = (plannedStr, actualStr, graceDays = 0) => {
    if (!plannedStr || !actualStr) return { days: 0, status: 'Green' };

    const planned = new Date(plannedStr);
    // Add grace days to planned date
    planned.setDate(planned.getDate() + graceDays);
    const actual = new Date(actualStr);
    
    // Clear hours for accurate calendar day count
    planned.setHours(0, 0, 0, 0);
    actual.setHours(0, 0, 0, 0);

    const diffTime = actual.getTime() - planned.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = 'Green'; // On Time
    if (diffDays > 0) {
      status = diffDays <= 2 ? 'Orange' : 'Red';
    }

    return {
      days: diffDays > 0 ? diffDays : 0,
      status
    };
  };

  const getStatusColorClass = (status) => {
    if (status === 'Red') return 'text-red-650 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50';
    if (status === 'Orange') return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
    return 'text-emerald-650 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Operational Workflow Tracking
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Monitor real-time progress, delivery schedules, actual vs planned completion dates, and delays.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          
          {/* Order Selection Panel */}
          <div className="glass-card rounded-xl border p-5 space-y-4">
            <span className="text-xs font-bold text-slate-navy-400 uppercase tracking-wide">
              Select Active Contract
            </span>
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {orders.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleSelectOrder(o)}
                  className={cn(
                    "w-full text-left rounded-lg p-3 border transition-all text-xs flex justify-between items-center group",
                    selectedOrder?.id === o.id
                      ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/10"
                      : "bg-white border-slate-100 hover:bg-slate-50 dark:bg-slate-navy-950 dark:border-slate-navy-900 dark:hover:bg-slate-navy-900 text-slate-navy-700 dark:text-slate-navy-300"
                  )}
                >
                  <div>
                    <h5 className="font-bold">{o.order_no}</h5>
                    <p className={cn("text-[10px] mt-0.5 max-w-[170px] truncate", selectedOrder?.id === o.id ? "text-brand-100" : "text-slate-navy-450")}>
                      {o.party_name}
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                    selectedOrder?.id === o.id 
                      ? "bg-white/20 text-white"
                      : o.status === 'Completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                  )}>
                    {o.status.split(' ')[1] || o.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Tracking View */}
          <div className="glass-card rounded-xl border p-6 lg:col-span-2 space-y-6">
            {selectedOrder ? (
              <>
                {/* Header Summary */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4 dark:border-slate-navy-800">
                  <div>
                    <span className="text-[10px] font-bold text-brand-600 uppercase">Target Contract</span>
                    <h3 className="text-lg font-bold font-heading text-slate-navy-850 dark:text-white mt-0.5">
                      Order: {selectedOrder.order_no} - {selectedOrder.party_name}
                    </h3>
                  </div>
                  {/* Quick PO viewer action */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDocument(selectedOrder.po_copy_url, `PO-${selectedOrder.order_no}.pdf`, 'PO', selectedOrder.order_no)}
                    className="self-start md:self-auto text-xs gap-1.5"
                  >
                    <FileText className="h-4 w-4 text-brand-600" />
                    Review Contract PO
                  </Button>
                </div>

                {/* Vertical Timeline Mapping */}
                <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-navy-800">
                  
                  {/* Step 1: Sale Order Created */}
                  <div className="relative space-y-2">
                    {/* Node marker */}
                    <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-xs font-bold text-slate-navy-850 dark:text-white">
                        1. Sale Contract Initialized & Registered
                      </h4>
                      <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                        Completed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-slate-50/50 p-3 rounded-lg border text-[11px] dark:bg-slate-navy-950/20 dark:border-slate-navy-850 text-slate-navy-500">
                      <div>
                        <span>Planned date:</span>
                        <p className="font-semibold text-slate-navy-800 dark:text-slate-navy-200 mt-0.5">
                          {new Date(selectedOrder.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span>Actual date:</span>
                        <p className="font-semibold text-slate-navy-800 dark:text-slate-navy-200 mt-0.5">
                          {new Date(selectedOrder.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span>Delay:</span>
                        <p className="font-bold text-emerald-600 mt-0.5">0 Days (On Time)</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Logistics Details */}
                  <div className="relative space-y-2">
                    {/* Node marker */}
                    {logisticsDetails ? (
                      <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950 dark:border-blue-900/30">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-xs font-bold text-slate-navy-850 dark:text-white">
                        2. Fleet Tonnage Allocated (Logistics Complete)
                      </h4>
                      {logisticsDetails ? (
                        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/20">
                          Logistics Pending
                        </span>
                      )}
                    </div>

                    {logisticsDetails ? (
                      <>
                        {/* Metrics delay math */}
                        {(() => {
                          const delay = getDelayInfo(selectedOrder.dispatch_date, logisticsDetails.created_at);
                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-slate-50/50 p-3 rounded-lg border text-[11px] dark:bg-slate-navy-950/20 dark:border-slate-navy-850 text-slate-navy-500">
                                <div>
                                  <span>Planned Dispatch Target:</span>
                                  <p className="font-semibold text-slate-navy-800 dark:text-slate-navy-200 mt-0.5">
                                    {new Date(selectedOrder.dispatch_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <span>Actual Dispatch loaded:</span>
                                  <p className="font-semibold text-slate-navy-800 dark:text-slate-navy-200 mt-0.5">
                                    {new Date(logisticsDetails.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <span>Delay status:</span>
                                  <span className={cn(
                                    "inline-flex mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase border",
                                    getStatusColorClass(delay.status)
                                  )}>
                                    {delay.days === 0 ? 'On Time' : `${delay.days} Days Delay`}
                                  </span>
                                </div>
                              </div>

                              {/* Logistics summary details */}
                              <div className="p-3 bg-slate-50 border rounded-lg text-[11px] flex justify-between items-center dark:bg-slate-navy-950/10 dark:border-slate-navy-850">
                                <div>
                                  <p><span className="font-bold text-slate-navy-700 dark:text-slate-navy-300">Carrier:</span> {logisticsDetails.transporter_name}</p>
                                  <p className="mt-1"><span className="font-bold text-slate-navy-700 dark:text-slate-navy-300">Truck/Bilty:</span> {logisticsDetails.truck_no} | Bilty No: {logisticsDetails.bilty_no}</p>
                                </div>
                                <button 
                                  onClick={() => openDocument(logisticsDetails.bilty_copy_url, `Bilty-${logisticsDetails.bilty_no}.pdf`, 'Bilty', selectedOrder.order_no)}
                                  className="text-brand-650 font-bold hover:underline"
                                >
                                  Open Bilty Note
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 border rounded-lg text-[11px] text-slate-navy-450 dark:bg-slate-navy-950/10 dark:border-slate-navy-850">
                        Waiting for logistics officer to enter dispatch details. Dispatch target date is {new Date(selectedOrder.dispatch_date).toLocaleDateString()}.
                      </div>
                    )}
                  </div>

                  {/* Step 3: Invoice Settlement */}
                  <div className="relative space-y-2">
                    {/* Node marker */}
                    {invoiceDetails ? (
                      <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-navy-900 dark:border-slate-navy-850">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-xs font-bold text-slate-navy-850 dark:text-white">
                        3. Accounts Invoice Settled (Billing Complete)
                      </h4>
                      {invoiceDetails ? (
                        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-450 dark:bg-slate-navy-900 dark:border-slate-navy-850">
                          Billing Pending
                        </span>
                      )}
                    </div>

                    {invoiceDetails ? (
                      <>
                        {(() => {
                          // Invoice planned date has 2 days grace period post dispatch target
                          const delay = getDelayInfo(selectedOrder.dispatch_date, invoiceDetails.created_at, 2);
                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-slate-50/50 p-3 rounded-lg border text-[11px] dark:bg-slate-navy-950/20 dark:border-slate-navy-850 text-slate-navy-500">
                                <div>
                                  <span>Planned Invoicing Target:</span>
                                  <p className="font-semibold text-slate-navy-800 dark:text-slate-navy-200 mt-0.5">
                                    {(() => {
                                      const d = new Date(selectedOrder.dispatch_date);
                                      d.setDate(d.getDate() + 2);
                                      return d.toLocaleDateString();
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <span>Actual Invoice Date:</span>
                                  <p className="font-semibold text-slate-navy-800 dark:text-slate-navy-200 mt-0.5">
                                    {new Date(invoiceDetails.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <span>Delay status:</span>
                                  <span className={cn(
                                    "inline-flex mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase border",
                                    getStatusColorClass(delay.status)
                                  )}>
                                    {delay.days === 0 ? 'On Time' : `${delay.days} Days Delay`}
                                  </span>
                                </div>
                              </div>

                              {/* Invoice summary info */}
                              <div className="p-3 bg-slate-50 border rounded-lg text-[11px] flex justify-between items-center dark:bg-slate-navy-950/10 dark:border-slate-navy-850">
                                <div>
                                  <p><span className="font-bold text-slate-navy-700 dark:text-slate-navy-300">Invoice Number:</span> {invoiceDetails.invoice_no}</p>
                                  <p className="mt-1"><span className="font-bold text-slate-navy-700 dark:text-slate-navy-300">Tax inclusive total:</span> {formatCurrency(selectedOrder.amount * 1.18)}</p>
                                </div>
                                <button 
                                  onClick={() => openDocument(invoiceDetails.invoice_copy_url, `Invoice-${invoiceDetails.invoice_no}.pdf`, 'Invoice', selectedOrder.order_no)}
                                  className="text-brand-650 font-bold hover:underline"
                                >
                                  Open Tax Invoice
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 border rounded-lg text-[11px] text-slate-navy-450 dark:bg-slate-navy-950/10 dark:border-slate-navy-850">
                        Invoicing details will show once dispatch fleet details are saved by logistics.
                      </div>
                    )}
                  </div>

                  {/* Step 4: Fully Settled & Completed */}
                  <div className="relative space-y-2">
                    {/* Node marker */}
                    {selectedOrder.status === 'Completed' ? (
                      <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="absolute -left-[37px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-navy-900 dark:border-slate-navy-850">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <h4 className="text-xs font-bold text-slate-navy-850 dark:text-white pt-1">
                      4. Order Settle Complete (Contract Closed)
                    </h4>
                    {selectedOrder.status === 'Completed' && (
                      <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-150 text-[11px] font-medium leading-normal dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400">
                        ✔ Contract has been fully processed. Real-time product inventory has been auto-adjusted to reflect the sale dispatch. All files are encrypted and locked.
                      </div>
                    )}
                  </div>

                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-navy-400 text-xs">
                Please select an active order from the sidebar panel to see its operational workflow timeline.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
export default Tracking;
