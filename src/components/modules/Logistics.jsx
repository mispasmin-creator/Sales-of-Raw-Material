import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  FileSpreadsheet, 
  AlertCircle, 
  UploadCloud, 
  CheckCircle, 
  Trash,
  Calculator,
  Eye
} from 'lucide-react';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog } from '../ui/dialog';
import { useApp } from '../../context/AppContext';
import { cn, formatCurrency, formatNumber } from '../../lib/utils';

export const Logistics = () => {
  const { addNotification, openDocument, userRole } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active' | 'history'

  // Manage Logistics State
  const [logisticsModalOpen, setLogisticsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Wizard Steps (Section 1 to 4)
  const [currentStep, setCurrentStep] = useState(1);
  const [transportType, setTransportType] = useState('FOR'); // 'FOR' | 'Ex Factory'
  const [transporterDesc, setTransporterDesc] = useState('');
  const [fixedDesc, setFixedDesc] = useState('');
  const [perMtDesc, setPerMtDesc] = useState('');

  // Form Fields
  const [transporterName, setTransporterName] = useState('');
  const [truckNo, setTruckNo] = useState('');
  const [biltyNo, setBiltyNo] = useState('');
  const [actualTruckQty, setActualTruckQty] = useState('');
  const [rateType, setRateType] = useState('Per MT'); // 'Fixed' | 'Per MT'
  const [rateValue, setRateValue] = useState('');
  
  // File Upload
  const [uploadedBilty, setUploadedBilty] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const orderList = await db.getOrders();
      // Filter only orders that are approved
      const approved = orderList.filter(o => o.status !== 'Pending Approval');
      setOrders(approved);
    } catch (e) {
      console.error("Failed to load logistics pending orders", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogisticsForm = (order) => {
    setSelectedOrder(order);
    setTransportType(order.transport_type === 'Ex Factory' ? 'Ex Factory' : 'FOR');
    setCurrentStep(1);
    setTransporterName('');
    setTruckNo('');
    setBiltyNo('');
    setActualTruckQty(order.qty.toString()); // default to ordered quantity
    setRateType('Per MT');
    setRateValue('');
    setUploadedBilty(null);
    setUploadProgress(0);
    setFormError('');
    setTransporterDesc('');
    setFixedDesc('');
    setPerMtDesc('');
    setLogisticsModalOpen(true);
  };

  const handleBiltyUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(15);

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadProgress(60);
      const result = event.target.result;
      const base64Data = result.split(',')[1];
      
      setUploadedBilty({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        base64: base64Data,
        url: file.name
      });
      setUploadProgress(100);
      setUploading(false);
      addNotification('File Selected', `Bilty Copy "${file.name}" read for upload.`, 'success');
    };
    
    reader.onerror = () => {
      setUploading(false);
      setFormError('Failed to read file for Google Drive upload.');
    };
    
    reader.readAsDataURL(file);
  };

  // Freight Auto Calculation
  const actualQtyNum = parseFloat(actualTruckQty) || 0;
  const rateValNum = parseFloat(rateValue) || 0;
  const calculatedFreight = rateType === 'Fixed' ? rateValNum : actualQtyNum * rateValNum;

  const validateStep = (step) => {
    setFormError('');
    if (step === 1) {
      if (!transportType) {
        setFormError('Please select Type of Transporting.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (transportType === 'FOR') {
        if (!transporterName.trim()) {
          setFormError('Transporter name is required.');
          return false;
        }
        if (!truckNo.trim()) {
          setFormError('Truck registration number is required.');
          return false;
        }
        if (!biltyNo.trim()) {
          setFormError('Bilty/Lorry receipt number is required.');
          return false;
        }
        const qtyVal = parseFloat(actualTruckQty);
        if (isNaN(qtyVal) || qtyVal <= 0) {
          setFormError('Actual truck quantity must be greater than 0 MT.');
          return false;
        }
        if (!rateType) {
          setFormError('Please select Type of Rate.');
          return false;
        }
      }
      return true;
    }
    if (step === 3) {
      const amtVal = parseFloat(rateValue);
      if (isNaN(amtVal) || amtVal <= 0) {
        setFormError('Please enter a valid Fixed Amount.');
        return false;
      }
      return true;
    }
    if (step === 4) {
      const rateVal = parseFloat(rateValue);
      if (isNaN(rateVal) || rateVal <= 0) {
        setFormError('Please enter a valid Per MT Rate.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      if (transportType === 'Ex Factory') {
        submitLogistics(true);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setRateValue('');
      if (rateType === 'Fixed') {
        setCurrentStep(3);
      } else {
        setCurrentStep(4);
      }
    }
  };

  const handleBack = () => {
    setFormError('');
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3 || currentStep === 4) {
      setCurrentStep(2);
    }
  };

  const submitLogistics = async (isExFactory = false) => {
    setFormError('');

    let logisticsData;
    if (isExFactory || transportType === 'Ex Factory') {
      logisticsData = {
        order_id: selectedOrder.id,
        transporter_name: "Ex-Factory / Self",
        truck_no: "Self",
        bilty_no: "Self",
        actual_truck_qty: parseFloat(selectedOrder.qty) || 0,
        bilty_copy_url: "",
        bilty_file_base64: "",
        bilty_file_name: "",
        bilty_file_type: "",
        rate_type: "Fixed",
        rate_value: 0,
        transport_type: "Ex Factory",
        description: ""
      };
    } else {
      const actualQtyNum = parseFloat(actualTruckQty) || 0;
      const rateValNum = parseFloat(rateValue) || 0;
      const descText = rateType === 'Fixed' ? fixedDesc : perMtDesc;
      const combinedDesc = `FOR - Transporter Notes: ${transporterDesc.trim() || 'None'}. Rate Details: ${descText.trim() || 'None'}`;

      logisticsData = {
        order_id: selectedOrder.id,
        transporter_name: transporterName.trim(),
        truck_no: truckNo.trim(),
        bilty_no: biltyNo.trim(),
        actual_truck_qty: actualQtyNum,
        bilty_copy_url: uploadedBilty ? uploadedBilty.name : '',
        bilty_file_base64: uploadedBilty ? uploadedBilty.base64 : '',
        bilty_file_name: uploadedBilty ? uploadedBilty.name : '',
        bilty_file_type: uploadedBilty ? uploadedBilty.type : '',
        rate_type: rateType,
        rate_value: rateValNum,
        transport_type: "FOR",
        description: combinedDesc
      };
    }

    try {
      await db.saveLogistics(logisticsData, userRole);
      addNotification('Logistics Pipeline Updated', `Transport dispatch finalized for order ${selectedOrder.order_no}.`, 'success');
      setLogisticsModalOpen(false);
      fetchPendingOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to register logistics details.');
    }
  };

  const handleSubmitLogistics = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep(currentStep)) return;
    submitLogistics(false);
  };

  // Filters
  const filteredOrders = orders
    .filter(o => 
      activeSubTab === 'active' 
        ? o.status === 'Pending Logistics' 
        : o.status === 'Pending Invoice' || o.status === 'Completed'
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
            Logistics & Dispatch Desk
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Manage active fleet allocations, lorry receipts (Bilty), and freight calculators.
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
            placeholder="Filter dispatches..."
            className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-slate-navy-200 bg-white text-xs text-slate-navy-900 focus:border-brand-500 focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-100"
          />
        </div>
        
        <span className="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-100 font-bold dark:bg-brand-950/20">
          {activeSubTab === 'active' ? 'Pending Logistics' : 'Dispatches Completed'}: {filteredOrders.length}
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
          Active Logistics
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

      {/* Table view of Pending Logistics */}
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
                        ? "All dispatches are loaded. Zero orders currently pending logistics!"
                        : "No historical dispatches found."}
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
                          (userRole === 'Admin' || userRole === 'Logistics') ? (
                            <Button 
                              onClick={() => handleOpenLogisticsForm(order)}
                              size="sm"
                              className="shadow-xs font-semibold gap-1 mx-auto"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Manage Dispatch
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-navy-400 font-bold flex items-center justify-center gap-1">
                              Lock (Restricted)
                            </span>
                          )
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border mx-auto uppercase",
                            order.status === 'Completed'
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/30"
                              : "bg-slate-100 text-slate-700 border-slate-200/30"
                          )}>
                            {order.status === 'Completed' ? 'Completed' : 'Dispatched'}
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

      {/* --- Manage Logistics Dialog --- */}
      <Dialog
        isOpen={logisticsModalOpen}
        onClose={() => setLogisticsModalOpen(false)}
        title={selectedOrder ? `Logistics allocation - ${selectedOrder.order_no}` : 'Manage Transport details'}
      >
        {selectedOrder && (
          <form onSubmit={handleSubmitLogistics} className="space-y-5">
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                {formError}
              </div>
            )}

            {/* Step Wizard Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-navy-900">
              <div>
                <h4 className="text-sm font-extrabold text-slate-navy-900 dark:text-white">
                  {currentStep === 1 && "Section 1 of 4: Transport Mode Selection"}
                  {currentStep === 2 && "Section 2 of 4: For Dispatch Details"}
                  {currentStep === 3 && "Section 3 of 4: Fixed Freight Rate"}
                  {currentStep === 4 && "Section 4 of 4: Per Metric Ton Freight Rate"}
                </h4>
                <p className="text-[10px] text-slate-navy-450 dark:text-slate-navy-400 font-medium">
                  {currentStep === 1 && "Select the logistics transport arrangement model."}
                  {currentStep === 2 && "Enter transport agency and truck parameters."}
                  {currentStep === 3 && "Define flat fixed freight details."}
                  {currentStep === 4 && "Define rate basis per metric ton details."}
                </p>
              </div>
              <span className="text-xs font-black text-brand-650 bg-brand-50 px-2 py-1 rounded dark:bg-brand-950/20">
                Step {currentStep} of 4
              </span>
            </div>

            {/* Step 1 Content */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <Input
                  label="Order No *"
                  value={selectedOrder.order_no}
                  disabled
                  className="bg-slate-50 dark:bg-slate-navy-900"
                />

                <Select
                  label="Type Of Transporting *"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  options={[
                    { value: 'FOR', label: 'For' },
                    { value: 'Ex Factory', label: 'Ex - Factory' }
                  ]}
                />
              </div>
            )}

            {/* Step 2 Content */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-brand-650 dark:text-brand-400 uppercase tracking-wider">For</span>
                  <Input
                    label="Description (optional)"
                    value={transporterDesc}
                    onChange={(e) => setTransporterDesc(e.target.value)}
                    placeholder="Enter transport/transporter notes..."
                  />
                </div>

                <Input
                  label="Transporter Name *"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  placeholder="e.g. FastTrack Cargo Carrier"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Truck No. *"
                    value={truckNo}
                    onChange={(e) => setTruckNo(e.target.value)}
                    placeholder="e.g. MH-12-PQ-9876"
                  />
                  <Input
                    label="Bilty No. *"
                    value={biltyNo}
                    onChange={(e) => setBiltyNo(e.target.value)}
                    placeholder="e.g. BL-990812"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Actual Truck Qty *"
                    type="number"
                    step="any"
                    value={actualTruckQty}
                    onChange={(e) => setActualTruckQty(e.target.value)}
                    placeholder="e.g. 250"
                  />

                  <Select
                    label="Type Of Rate *"
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value)}
                    options={[
                      { value: 'Fixed', label: 'Fixed' },
                      { value: 'Per MT', label: 'Per Matric Ton Rate' }
                    ]}
                  />
                </div>

                {/* Bilty Copy Uploader */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-navy-700 dark:text-slate-navy-300">
                    Bilty Copy
                  </label>

                  <div>
                    {!uploadedBilty && !uploading && (
                      <label 
                        htmlFor="bilty-upload-input"
                        className="border-2 border-dashed border-slate-navy-200 rounded-xl p-4.5 text-center bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30 block cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="space-y-2">
                          <UploadCloud className="h-6 w-6 text-slate-navy-450 mx-auto" />
                          <div className="text-xs text-slate-navy-500">
                            <span className="font-bold text-brand-650 hover:underline">
                              Click to upload Bilty Copy
                            </span>
                            <p className="text-[10px] text-slate-navy-450 mt-0.5">Accepts PDF or images</p>
                          </div>
                        </div>
                        <input 
                          id="bilty-upload-input"
                          type="file" 
                          accept="application/pdf,image/*" 
                          onChange={handleBiltyUpload}
                          className="hidden" 
                        />
                      </label>
                    )}

                    {uploading && (
                      <div className="border border-slate-navy-200 rounded-xl p-4.5 bg-slate-50/50 dark:border-slate-navy-800 dark:bg-slate-navy-900/30">
                        <div className="space-y-2.5">
                          <div className="flex justify-between text-xs font-bold text-brand-700 dark:text-brand-300 px-1">
                            <span>Uploading Bilty...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden dark:bg-slate-navy-800">
                            <div 
                              className="bg-brand-600 h-full rounded-full transition-all duration-150"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {uploadedBilty && (
                      <div className="flex items-center justify-between bg-white border rounded-lg p-2.5 dark:bg-slate-navy-950 dark:border-slate-navy-850">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-navy-800 dark:text-slate-navy-200 truncate max-w-[150px]">
                              {uploadedBilty.name}
                            </p>
                            <p className="text-[10px] text-slate-navy-400">{uploadedBilty.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 dark:bg-emerald-950/20">
                            <CheckCircle className="h-3 w-3" /> Ready
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            type="button"
                            onClick={() => setUploadedBilty(null)} 
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 Content */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-brand-650 dark:text-brand-400 uppercase tracking-wider">Fixed</span>
                  <Input
                    label="Description (optional)"
                    value={fixedDesc}
                    onChange={(e) => setFixedDesc(e.target.value)}
                    placeholder="Enter fixed pricing descriptions/notes..."
                  />
                </div>

                <Input
                  label="Fixed Amount *"
                  type="number"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  placeholder="e.g. 15000"
                />

                {/* Freight cost dynamic math */}
                <div className="rounded-lg bg-orange-50/20 border border-orange-200/50 p-4 flex justify-between items-center dark:bg-slate-navy-950 dark:border-slate-navy-800">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-orange-500" />
                    <div>
                      <span className="text-[10px] font-bold text-orange-850 dark:text-slate-navy-400 uppercase">Estimated Freight Payable</span>
                      <p className="text-base font-extrabold text-orange-950 dark:text-white mt-0.5">
                        {formatCurrency(calculatedFreight)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 Content */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-brand-650 dark:text-brand-400 uppercase tracking-wider">Per Matric Ton Rate</span>
                  <Input
                    label="Description (optional)"
                    value={perMtDesc}
                    onChange={(e) => setPerMtDesc(e.target.value)}
                    placeholder="Enter per metric ton pricing notes..."
                  />
                </div>

                <Input
                  label="Per Mt Rate *"
                  type="number"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  placeholder="e.g. 350"
                />

                {/* Freight cost dynamic math */}
                <div className="rounded-lg bg-orange-50/20 border border-orange-200/50 p-4 flex justify-between items-center dark:bg-slate-navy-950 dark:border-slate-navy-800">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-orange-500" />
                    <div>
                      <span className="text-[10px] font-bold text-orange-850 dark:text-slate-navy-400 uppercase">Estimated Freight Payable</span>
                      <p className="text-base font-extrabold text-orange-950 dark:text-white mt-0.5">
                        {formatCurrency(calculatedFreight)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step Action Buttons */}
            <div className="flex justify-end gap-2 border-t pt-4 mt-6">
              {currentStep > 1 ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                >
                  Back
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLogisticsModalOpen(false)}
                >
                  Cancel
                </Button>
              )}

              {/* Show Next or Confirm Dispatch button depending on the step and selection */}
              {currentStep === 1 && transportType === 'Ex Factory' ? (
                <Button type="submit" loading={uploading}>
                  Confirm Dispatch
                </Button>
              ) : (currentStep === 3 || currentStep === 4) ? (
                <Button type="submit" loading={uploading}>
                  Confirm Dispatch
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </form>
        )}
      </Dialog>

    </div>
  );
};
export default Logistics;
