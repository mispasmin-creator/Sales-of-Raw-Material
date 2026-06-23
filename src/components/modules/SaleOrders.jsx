import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  UploadCloud, 
  Eye, 
  Trash,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog } from '../ui/dialog';
import { useApp } from '../../context/AppContext';
import { cn, formatCurrency, formatNumber } from '../../lib/utils';

export const SaleOrders = () => {
  const { addNotification, openDocument, userRole } = useApp();
  const [orders, setOrders] = useState([]);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [firms, setFirms] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active' | 'history'
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stockWarningModal, setStockWarningModal] = useState({ open: false, data: null });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form Fields
  const [nextOrderNo, setNextOrderNo] = useState('RM-0001');
  const [formFirmName, setFormFirmName] = useState('');
  const [formParty, setFormParty] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formTransport, setFormTransport] = useState('FOR');
  const [formDispatchDate, setFormDispatchDate] = useState('');
  
  // Simulated File Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [formError, setFormError] = useState('');
  const [draftRestoredAlert, setDraftRestoredAlert] = useState(false);

  useEffect(() => {
    fetchOrdersAndMasters();
    loadDraft();
  }, []);

  const fetchOrdersAndMasters = async () => {
    try {
      setLoading(true);
      const [orderList, partyList, prodList, firmList] = await Promise.all([
        db.getOrders(),
        db.getParties(),
        db.getProducts(),
        db.getFirms()
      ]);
      setOrders(orderList);
      setParties(partyList);
      setProducts(prodList);
      setFirms(firmList);
      
      // Calculate next order serial number
      const num = orderList.length + 1;
      setNextOrderNo(`RM-${String(num).padStart(4, '0')}`);
    } catch (e) {
      console.error("Failed to fetch orders or masters", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (orderNo, approve) => {
    try {
      await db.approveOrder(orderNo, approve, userRole);
      if (approve) {
        addNotification('Order Approved', `Sale Order ${orderNo} approved and sent to Logistics.`, 'success');
      } else {
        addNotification('Order Approval Revoked', `Sale Order ${orderNo} marked as Pending Approval.`, 'info');
      }
      await fetchOrdersAndMasters();
    } catch (e) {
      console.error("Failed to toggle order approval", e);
      addNotification('Approval Error', e.message || 'Failed to update order status.', 'error');
    }
  };

  // --- Draft Auto Save Engine ---
  useEffect(() => {
    if (!createModalOpen) return;
    const draft = {
      firm_name: formFirmName,
      party_id: formParty,
      product_id: formProduct,
      qty: formQty,
      rate: formRate,
      transport_type: formTransport,
      dispatch_date: formDispatchDate,
      file: uploadedFile
    };
    // Only save if some fields are populated to avoid saving blank frames
    if (formFirmName || formParty || formProduct || formQty || formRate || formDispatchDate || uploadedFile) {
      localStorage.setItem('fms_sale_order_draft', JSON.stringify(draft));
    }
  }, [formFirmName, formParty, formProduct, formQty, formRate, formTransport, formDispatchDate, uploadedFile, createModalOpen]);

  const loadDraft = () => {
    const raw = localStorage.getItem('fms_sale_order_draft');
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        setFormFirmName(draft.firm_name || '');
        setFormParty(draft.party_id || '');
        setFormProduct(draft.product_id || '');
        setFormQty(draft.qty || '');
        setFormRate(draft.rate || '');
        setFormTransport(draft.transport_type || 'FOR');
        setFormDispatchDate(draft.dispatch_date || '');
        setUploadedFile(draft.file || null);
        setDraftRestoredAlert(true);
      } catch (e) {
        console.error("Failed to parse local draft", e);
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('fms_sale_order_draft');
    setFormFirmName('');
    setFormParty('');
    setFormProduct('');
    setFormQty('');
    setFormRate('');
    setFormTransport('FOR');
    setFormDispatchDate('');
    setUploadedFile(null);
    setUploadProgress(0);
    setDraftRestoredAlert(false);
  };

  const handleOpenCreateModal = () => {
    setFormError('');
    setCreateModalOpen(true);
  };

  // --- Upload Simulator & Base64 Reader ---
  const handleFileUploadSimulate = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(15);

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadProgress(60);
      const result = event.target.result;
      const base64Data = result.split(',')[1];
      
      setUploadedFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        base64: base64Data,
        url: file.name // Fallback display name
      });
      setUploadProgress(100);
      setUploading(false);
      addNotification('File Selected', `PO Copy "${file.name}" read for upload.`, 'success');
    };
    
    reader.onerror = () => {
      setUploading(false);
      setFormError('Failed to read file for Google Drive upload.');
    };
    
    reader.readAsDataURL(file);
  };

  // --- Submit Order ---
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFirmName.trim()) return setFormError('Please enter Firm Name.');
    if (!formParty) return setFormError('Please select a Party.');
    if (!formProduct) return setFormError('Please select a Product.');
    
    const qtyVal = parseFloat(formQty);
    if (isNaN(qtyVal) || qtyVal <= 0) return setFormError('Tonnage Quantity must be greater than 0.');
    
    const rateVal = parseFloat(formRate);
    if (isNaN(rateVal) || rateVal < 0) return setFormError('Rate must be a positive number.');
    
    if (!formDispatchDate) return setFormError('Dispatch date is required.');
    if (!uploadedFile) return setFormError('Please upload PO copy file.');

    // Find Product to validate stock levels
    const selectedProd = products.find(p => p.id === formProduct);
    if (!selectedProd) return setFormError('Invalid product selected.');

    const orderData = {
      firm_name: formFirmName.trim(),
      party_id: formParty,
      product_id: formProduct,
      qty: qtyVal,
      rate: rateVal,
      transport_type: formTransport,
      dispatch_date: formDispatchDate,
      po_copy_url: uploadedFile.name,
      po_file_base64: uploadedFile.base64,
      po_file_name: uploadedFile.name,
      po_file_type: uploadedFile.type
    };

    // Save order directly without checking inventory levels
    saveOrderToDatabase(orderData);
  };

  const saveOrderToDatabase = async (orderData) => {
    try {
      await db.createOrder(orderData, userRole);
      addNotification('Order Process Initiated', `Sale Order ${nextOrderNo} created successfully.`, 'success');
      setCreateModalOpen(false);
      clearDraft();
      fetchOrdersAndMasters();
    } catch (err) {
      setFormError(err.message || 'Failed to save order.');
    }
  };

  const handleProceedWithStockWarning = () => {
    const { orderData } = stockWarningModal.data;
    setStockWarningModal({ open: false, data: null });
    saveOrderToDatabase(orderData);
  };

  // Filters
  const filteredOrders = orders
    .filter(o => 
      activeSubTab === 'active' 
        ? o.status === 'Pending Approval' 
        : o.status !== 'Pending Approval'
    )
    .filter(o => 
      o.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Auto amount math
  const calculatedAmount = (parseFloat(formQty) || 0) * (parseFloat(formRate) || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Sale Order Registry
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Create new sale agreements, upload Purchase Orders, and dispatch fleet orders.
          </p>
        </div>

        {/* Create button */}
        {(userRole === 'Admin' || userRole === 'Sales') && (
          <Button onClick={handleOpenCreateModal} className="gap-1.5 shadow-xs">
            <Plus className="h-4.5 w-4.5" />
            Create Sale Order
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-4.5 shadow-xs dark:bg-slate-navy-950 dark:border-slate-navy-900">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order, customer, product..."
            className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-slate-navy-200 bg-white text-xs text-slate-navy-900 focus:border-brand-500 focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-100"
          />
        </div>

        {/* Clear draft action helper if draft is saved */}
        {localStorage.getItem('fms_sale_order_draft') && (
          <Button variant="ghost" size="sm" onClick={clearDraft} className="text-xs gap-1 text-slate-navy-400 hover:text-slate-navy-650">
            <RotateCcw className="h-3.5 w-3.5" />
            Wipe Saved Draft
          </Button>
        )}
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
          Active Orders
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

      {/* Main Table */}
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
                  {activeSubTab === 'active' && <th className="p-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-50 dark:divide-slate-navy-900">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={activeSubTab === 'active' ? 11 : 10} className="p-8 text-center text-slate-navy-400">
                      No matching sales orders registered in FMS ledger.
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
                          order.status === 'Pending Logistics' && "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50",
                          order.status === 'Pending Approval' && "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200/50"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      {activeSubTab === 'active' && (
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setViewModalOpen(true);
                            }}
                            className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-brand-500 text-brand-650 hover:bg-brand-50/50 dark:text-brand-400 dark:hover:bg-slate-navy-900 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Dialog Create Order --- */}
      <Dialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={`Register New Sale Contract (${nextOrderNo})`}
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          
          {/* Draft restored indicator */}
          {draftRestoredAlert && (
            <div className="bg-brand-50 text-brand-700 p-3 rounded-lg border border-brand-200 text-xs flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-4 w-4 text-brand-600 animate-pulse" />
                Unfinished contract details restored from auto-saved draft.
              </span>
              <button type="button" onClick={clearDraft} className="font-bold underline text-brand-600">
                Clear
              </button>
            </div>
          )}

          {formError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <Select
            label="Firm Name"
            value={formFirmName}
            onChange={(e) => setFormFirmName(e.target.value)}
          >
            <option value="">-- Choose Firm --</option>
            {firms.map(f => <option key={f} value={f}>{f}</option>)}
          </Select>

          <Select
            label="Party Name"
            value={formParty}
            onChange={(e) => setFormParty(e.target.value)}
          >
            <option value="">-- Choose Party --</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select
            label="Product Name"
            value={formProduct}
            onChange={(e) => setFormProduct(e.target.value)}
          >
            <option value="">-- Choose Product --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity (Metric Tons)"
              type="number"
              value={formQty}
              onChange={(e) => setFormQty(e.target.value)}
              placeholder="e.g. 250"
            />
            <Input
              label="Rate per Metric Ton (₹)"
              type="number"
              value={formRate}
              onChange={(e) => setFormRate(e.target.value)}
              placeholder="e.g. 45000"
            />
          </div>

          {/* Amount Calculation Visualizer */}
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/50 flex justify-between items-center dark:bg-slate-navy-950 dark:border-slate-navy-800">
            <div>
              <span className="text-[10px] font-semibold text-slate-navy-400 uppercase">Subtotal Amount</span>
              <p className="text-base font-extrabold text-slate-navy-850 dark:text-white mt-0.5">
                {formatCurrency(calculatedAmount)}
              </p>
            </div>
            <span className="text-[10px] text-slate-navy-400 font-semibold bg-white border px-2 py-1 rounded dark:bg-slate-navy-900 dark:border-slate-navy-850">
              Tax exclusive rate
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type Of Transporting"
              value={formTransport}
              onChange={(e) => setFormTransport(e.target.value)}
              options={[
                { value: 'FOR', label: 'FOR Destination' },
                { value: 'Ex Factory', label: 'Ex Factory Depot' }
              ]}
            />

            <Input
              label="Date Of Dispatch"
              type="date"
              value={formDispatchDate}
              onChange={(e) => setFormDispatchDate(e.target.value)}
            />
          </div>

          {/* PO Copy Uploader widget with speed/progress bars */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-navy-700 dark:text-slate-navy-300">
              Upload Purchase Order (PO) Copy
            </label>
            
            <div>
              {!uploadedFile && !uploading && (
                <label 
                  htmlFor="po-upload-input"
                  className="border-2 border-dashed border-slate-navy-200 rounded-xl p-6 text-center bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30 block cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="space-y-3">
                    <UploadCloud className="h-8 w-8 text-slate-navy-455 mx-auto" />
                    <div className="text-xs text-slate-navy-500">
                      <span className="font-bold text-brand-650 hover:underline">
                        Click to choose PO copy file
                      </span>
                      <p className="text-[10px] text-slate-navy-450 mt-1">Accepts PDF, JPG, PNG</p>
                    </div>
                  </div>
                  <input 
                    id="po-upload-input"
                    type="file" 
                    accept="application/pdf,image/*" 
                    onChange={handleFileUploadSimulate}
                    className="hidden" 
                  />
                </label>
              )}

              {uploading && (
                <div className="border border-slate-navy-200 rounded-xl p-6 text-center bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-brand-700 dark:text-brand-300 px-1">
                      <span>Uploading contract copy...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    {/* Progress bar wrapper */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden dark:bg-slate-navy-800">
                      <div 
                        className="bg-brand-600 h-full rounded-full transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-navy-400">Processing upload to secure Supabase storage...</p>
                  </div>
                </div>
              )}

              {uploadedFile && (
                <div className="border border-slate-navy-200 rounded-xl p-4 bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30">
                  <div className="flex items-center justify-between bg-white border rounded-lg p-3 dark:bg-slate-navy-950 dark:border-slate-navy-850">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-500" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-navy-800 dark:text-slate-navy-200 truncate max-w-[180px]">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-navy-400">{uploadedFile.size}</p>
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
                        onClick={() => setUploadedFile(null)} 
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={uploading}>
              Save and Register Order
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --- Stock Warning Alert Dialog --- */}
      <Dialog
        isOpen={stockWarningModal.open}
        onClose={() => setStockWarningModal({ open: false, data: null })}
        title="⚠️ Critical: Stock Deficit Warning"
      >
        {stockWarningModal.data && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl dark:bg-amber-950/30 dark:border-amber-900/50">
              <AlertTriangle className="h-10 w-10 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-400">
                  Insufficient Stock for {stockWarningModal.data.prodName}
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 leading-normal font-medium">
                  The requested order quantity is <span className="font-extrabold text-amber-900 dark:text-amber-300">{formatNumber(stockWarningModal.data.requested, 1)} MT</span>, 
                  but the current available inventory balance is only <span className="font-extrabold text-amber-900 dark:text-amber-300">{formatNumber(stockWarningModal.data.available, 1)} MT</span>.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-navy-500 dark:text-slate-navy-400 leading-relaxed font-medium">
              Enterprise guidelines allow reserving orders in deficit (marked as pre-backorder). However, dispatch logistics cannot be completed until stock levels are replenished. Do you wish to override and save the order anyway?
            </p>

            <div className="flex justify-end gap-2.5 border-t pt-4 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setStockWarningModal({ open: false, data: null })}
              >
                No, Revise Quantity
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleProceedWithStockWarning}
              >
                Yes, Force Save Order
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* --- Dialog View Order Details & Approval Actions --- */}
      <Dialog
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={selectedOrder ? `Sale Order: ${selectedOrder.order_no}` : "Sale Order Details"}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Firm Name</span>
                <p className="font-semibold text-slate-navy-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {selectedOrder.firm_name || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Party Name</span>
                <p className="font-semibold text-slate-navy-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {selectedOrder.party_name}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Product Name</span>
                <p className="font-semibold text-slate-navy-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {selectedOrder.product_name}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Transport Type</span>
                <p className="font-semibold text-slate-navy-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {selectedOrder.transport_type}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Quantity</span>
                <p className="font-bold text-slate-navy-900 dark:text-white bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {formatNumber(selectedOrder.qty, 1)} MT
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Rate per Ton</span>
                <p className="font-bold text-slate-navy-900 dark:text-white bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {formatCurrency(selectedOrder.rate)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Dispatch Date</span>
                <p className="font-semibold text-slate-navy-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-navy-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850">
                  {new Date(selectedOrder.dispatch_date).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-navy-400 uppercase tracking-wider text-[9px]">Status</span>
                <div className="px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-navy-850 bg-slate-50 dark:bg-slate-navy-900 flex items-center">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                    selectedOrder.status === 'Completed' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50",
                    selectedOrder.status === 'Pending Invoice' && "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50",
                    selectedOrder.status === 'Pending Logistics' && "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50",
                    selectedOrder.status === 'Pending Approval' && "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200/50"
                  )}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Amount Summary banner */}
            <div className="rounded-xl bg-slate-50 p-4.5 border border-slate-200/50 flex justify-between items-center dark:bg-slate-navy-950 dark:border-slate-navy-800 mt-2">
              <div>
                <span className="text-[10px] font-bold text-slate-navy-400 uppercase tracking-wider">Total Contract Value</span>
                <p className="text-lg font-black text-slate-navy-950 dark:text-white mt-0.5">
                  {formatCurrency(selectedOrder.qty * selectedOrder.rate)}
                </p>
              </div>
              {selectedOrder.po_copy_url && (
                <button
                  type="button"
                  onClick={() => {
                    openDocument(selectedOrder.po_copy_url, `PO-${selectedOrder.order_no}.pdf`, 'PO', selectedOrder.order_no);
                    setViewModalOpen(false); // close details modal when viewing doc
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-brand-650 bg-white border border-slate-200 hover:border-brand-500 rounded-lg dark:bg-slate-navy-900 dark:border-slate-navy-800 dark:text-brand-400 hover:text-brand-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileText className="h-4 w-4" />
                  View PO Copy
                </button>
              )}
            </div>

            {/* Action options: Approve or Reject at the bottom */}
            <div className="flex justify-between items-center border-t pt-4 mt-6">
              <span className="text-[10px] font-bold text-slate-navy-450 uppercase">
                Access Level: {userRole}
              </span>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setViewModalOpen(false)}
                >
                  Close
                </Button>
                
                {(() => {
                  const isApproved = selectedOrder.status !== 'Pending Approval';
                  const isLocked = selectedOrder.status === 'Pending Invoice' || selectedOrder.status === 'Completed';
                  
                  if (isLocked) {
                    return (
                      <span className="text-xs text-slate-navy-450 font-bold italic py-2 px-1">
                        Order processed: status locked.
                      </span>
                    );
                  }
                  
                  return (
                    <>
                      {isApproved ? (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={async () => {
                            await handleToggleApproval(selectedOrder.order_no, false);
                            setViewModalOpen(false);
                          }}
                        >
                          Reject / Revoke Approval
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 font-bold animate-pulse"
                          onClick={async () => {
                            await handleToggleApproval(selectedOrder.order_no, true);
                            setViewModalOpen(false);
                          }}
                        >
                          Approve Order
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

          </div>
        )}
      </Dialog>

    </div>
  );
};
export default SaleOrders;
