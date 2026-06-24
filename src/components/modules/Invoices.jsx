import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  Search, 
  Eye, 
  FileText, 
  AlertTriangle, 
  UploadCloud, 
  CheckCircle,
  Trash
} from 'lucide-react';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog } from '../ui/dialog';
import { useApp } from '../../context/AppContext';
import { cn, formatCurrency, formatNumber, hasPageAccess, filterByFirmAccess } from '../../lib/utils';

export const Invoices = () => {
  const { addNotification, openDocument, userRole, currentUser } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active' | 'history'

  // Invoice creation state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form Fields
  const [invoiceNo, setInvoiceNo] = useState('');
  const [uploadedInvoice, setUploadedInvoice] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchOrdersPendingInvoice();
  }, [currentUser]);

  const fetchOrdersPendingInvoice = async () => {
    try {
      setLoading(true);
      const orderList = await db.getOrders();
      // Filter only orders that are dispatched or completed
      const dispatched = filterByFirmAccess(orderList, currentUser)
        .filter(o => o.status === 'Pending Invoice' || o.status === 'Completed');
      setOrders(dispatched);
    } catch (e) {
      console.error("Failed to load invoice pending orders", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInvoiceForm = (order) => {
    setSelectedOrder(order);
    
    // Auto generate suggestion for invoice number
    const countNum = Math.floor(Math.random() * 9000) + 1000;
    setInvoiceNo(`INV-${new Date().getFullYear()}-${countNum}`);
    
    setUploadedInvoice(null);
    setUploadProgress(0);
    setFormError('');
    setInvoiceModalOpen(true);
  };

  const handleInvoiceUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(15);

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadProgress(60);
      const result = event.target.result;
      const base64Data = result.split(',')[1];
      
      setUploadedInvoice({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        base64: base64Data,
        url: file.name
      });
      setUploadProgress(100);
      setUploading(false);
      addNotification('File Selected', `Invoice Copy "${file.name}" read for upload.`, 'success');
    };
    
    reader.onerror = () => {
      setUploading(false);
      setFormError('Failed to read file for Google Drive upload.');
    };
    
    reader.readAsDataURL(file);
  };

  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!invoiceNo.trim()) return setFormError('Invoice number is required.');
    if (!uploadedInvoice) return setFormError('Please upload tax invoice scan copy.');

    const invoiceData = {
      order_id: selectedOrder.id,
      invoice_no: invoiceNo.trim(),
      invoice_copy_url: uploadedInvoice.name,
      invoice_file_base64: uploadedInvoice.base64,
      invoice_file_name: uploadedInvoice.name,
      invoice_file_type: uploadedInvoice.type
    };

    setSubmitting(true);
    try {
      await db.saveInvoice(invoiceData, userRole);
      
      addNotification('Commercial Invoice Settled', `Tax Invoice ${invoiceNo} generated. Order ${selectedOrder.order_no} finalized.`, 'success');
      addNotification('Inventory Updated', `Stock deducted dynamically for order ${selectedOrder.order_no}.`, 'info');
      
      setInvoiceModalOpen(false);
      fetchOrdersPendingInvoice();
    } catch (err) {
      setFormError(err.message || 'Failed to settle invoice ledger.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredOrders = orders
    .filter(o => 
      activeSubTab === 'active' 
        ? o.status === 'Pending Invoice' 
        : o.status === 'Completed'
    )
    .filter(o => 
      o.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Invoices
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Clear dispatches past logistics verification, register tax invoices, and complete contract closures.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-4.5 shadow-xs dark:bg-slate-navy-950 dark:border-slate-navy-900">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter invoices..."
            className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-slate-navy-200 bg-white text-xs text-slate-navy-900 focus:border-brand-500 focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-100"
          />
        </div>
        
        <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold dark:bg-emerald-950/20">
          {activeSubTab === 'active' ? 'Ready for Invoicing' : 'Fully Invoiced'}: {filteredOrders.length}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-navy-800">
        <button
          onClick={() => setActiveSubTab('active')}
          className={cn(
            "pb-3 text-xs font-bold border-b-2 px-4 transition-all duration-150 focus:outline-none",
            activeSubTab === 'active'
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          )}
        >
          Active Invoicing
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={cn(
            "pb-3 text-xs font-bold border-b-2 px-4 transition-all duration-150 focus:outline-none",
            activeSubTab === 'history'
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          )}
        >
          History
        </button>
      </div>

      {/* Orders Pending Invoice Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900 dark:border-slate-navy-800 dark:text-slate-navy-400">
                  <th className="p-4">Order No.</th>
                  <th className="p-4">Firm Name</th>
                  <th className="p-4">Party Name</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4 text-right">Qty</th>
                  <th className="p-4 text-right">Rate</th>
                  <th className="p-4">Type Of Transporting</th>
                  <th className="p-4">Date Of Dispatch</th>
                  <th className="p-4">PO Copy</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-50 dark:divide-slate-navy-900">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-slate-navy-400">
                      {activeSubTab === 'active'
                        ? "Zero orders are pending invoicing. Accounts ledger matches dispatches."
                        : "No invoice history entries found."}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-navy-900/30">
                      <td className="p-4 font-bold text-brand-650 dark:text-brand-400">{order.order_no}</td>
                      <td className="p-4 text-slate-navy-650 font-medium dark:text-slate-navy-300">{order.firm_name || '-'}</td>
                      <td className="p-4 font-semibold text-slate-navy-800 dark:text-slate-navy-200">{order.party_name}</td>
                      <td className="p-4 text-slate-navy-500 font-medium">{order.product_name}</td>
                      <td className="p-4 text-right font-semibold text-slate-800 dark:text-slate-200">{formatNumber(order.qty, 1)} MT</td>
                      <td className="p-4 text-right text-slate-navy-500">{formatCurrency(order.rate)}</td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                          order.transport_type === 'FOR' 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                        )}>
                          {order.transport_type}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-navy-500">{new Date(order.dispatch_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        {order.po_copy_url ? (
                          <button 
                            type="button"
                            onClick={() => openDocument(order.po_copy_url, `PO-${order.order_no}.pdf`, 'PO', order.order_no)}
                            className="font-semibold text-brand-650 hover:underline hover:text-brand-700 truncate max-w-[120px] block text-left"
                            title={order.po_copy_url}
                          >
                            {order.po_copy_url.split('/').pop()}
                          </button>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                          order.status === 'Completed' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50",
                          order.status === 'Pending Invoice' && "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50",
                          order.status === 'Pending Logistics' && "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {activeSubTab === 'active' ? (
                          hasPageAccess(userRole, 'Accounts') ? (
                            <Button 
                              onClick={() => handleOpenInvoiceForm(order)}
                              size="sm"
                              className="shadow-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 mx-auto"
                            >
                              <ReceiptText className="h-3.5 w-3.5" />
                              Clear Invoice
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-navy-400 font-bold flex items-center justify-center gap-1">
                              Lock (Restricted)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/20 border border-emerald-200/30 mx-auto uppercase">
                            Paid & Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Settle Invoice Dialog --- */}
      <Dialog
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={selectedOrder ? `Generate Commercial Tax Invoice - Order ${selectedOrder.order_no}` : 'Invoice Generation'}
      >
        {selectedOrder && (
          <form onSubmit={handleSubmitInvoice} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                {formError}
              </div>
            )}

            <Input
              label="Order No."
              value={selectedOrder.order_no}
              disabled
              className="bg-slate-50 dark:bg-slate-navy-900"
            />

            <Input
              label="Invoice Number Registration"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-2026-90812"
            />

            {/* Invoice Copy Uploader */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-navy-700 dark:text-slate-navy-300">
                Upload Tax Invoice Scan Copy
              </label>

              <div>
                {!uploadedInvoice && !uploading && (
                  <label 
                    htmlFor="invoice-upload-input"
                    className="border-2 border-dashed border-slate-navy-200 rounded-xl p-6 text-center bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30 block cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors animate-fade-in"
                  >
                    <div className="space-y-3">
                      <UploadCloud className="h-8 w-8 text-slate-navy-450 mx-auto" />
                      <div className="text-xs text-slate-navy-500">
                        <span className="font-bold text-brand-650 hover:underline">
                          Choose Invoice Copy
                        </span>
                        <p className="text-[10px] text-slate-navy-450 mt-1">Accepts PDF or images (Max 5MB)</p>
                      </div>
                    </div>
                    <input 
                      id="invoice-upload-input"
                      type="file" 
                      accept="application/pdf,image/*" 
                      onChange={handleInvoiceUpload}
                      className="hidden" 
                    />
                  </label>
                )}

                {uploading && (
                  <div className="border border-slate-navy-200 rounded-xl p-6 bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-brand-700 dark:text-brand-300 px-1">
                        <span>Uploading Invoice copy...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden dark:bg-slate-navy-800">
                        <div 
                          className="bg-brand-600 h-full rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {uploadedInvoice && (
                  <div className="flex items-center justify-between bg-white border rounded-lg p-3 dark:bg-slate-navy-950 dark:border-slate-navy-850">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-500" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-navy-800 dark:text-slate-navy-200 truncate max-w-[180px]">
                          {uploadedInvoice.name}
                        </p>
                        <p className="text-[10px] text-slate-navy-400">{uploadedInvoice.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 dark:bg-emerald-950/20">
                        <CheckCircle className="h-3 w-3" /> Ready
                      </span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setUploadedInvoice(null)} 
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setInvoiceModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700">
                {submitting ? "Settling Invoice..." : "Complete and Settle Order"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

    </div>
  );
};
export default Invoices;
