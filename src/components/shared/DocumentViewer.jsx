import React, { useState } from 'react';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Printer, 
  X, 
  Info,
  Calendar,
  User,
  HardDrive
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/button';
import { formatCurrency, formatNumber } from '../../lib/utils';

export const DocumentViewer = () => {
  const { docViewer, closeDocument } = useApp();
  const [zoom, setZoom] = useState(100);

  if (!docViewer.open) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 70));
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Simulate downloading by generating a text file representing the mock doc
    const element = document.createElement("a");
    const file = new Blob([`FMS Mock Document\nOrder Number: ${docViewer.orderNo}\nFile: ${docViewer.fileName}\nType: ${docViewer.fileType}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${docViewer.fileName}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Generate mock details depending on file type for maximum realism
  const renderDocumentContent = () => {
    switch (docViewer.fileType) {
      case 'PO':
        return (
          <div className="bg-white text-slate-800 p-8 shadow-md rounded-sm border border-slate-200 w-full min-h-[700px] text-xs font-sans">
            {/* PO Header */}
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <h2 className="text-xl font-bold uppercase text-slate-900 tracking-wider">Purchase Order</h2>
                <p className="text-[10px] text-slate-500 mt-1">Ref No: PO-{docViewer.orderNo}</p>
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-900">Apex Steel Industries Ltd.</h3>
                <p>Industrial Estate, Phase III, Sector 4</p>
                <p>New Delhi - 110025</p>
                <p className="mt-1">GISTIN: 07AAACA4491N1ZX</p>
              </div>
            </div>

            {/* PO Info */}
            <div className="grid grid-cols-2 gap-6 my-6 border-b pb-6">
              <div>
                <h4 className="font-bold text-slate-500 uppercase text-[9px] mb-1">Vendor:</h4>
                <p className="font-bold text-slate-900">Sale Of Raw Material FMS Enterprise</p>
                <p>Corporate logistics depot, Area 12</p>
                <p>Mumbai, Maharashtra - 400001</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-500 uppercase text-[9px] mb-1">Shipping Details:</h4>
                <p className="font-bold text-slate-900">Apex Steel Smelter - Plant 2</p>
                <p>Plot 88A, Industrial Hub</p>
                <p>Gurugram, Haryana - 122001</p>
              </div>
            </div>

            {/* PO Meta */}
            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg mb-6 text-[10px]">
              <div>
                <span className="text-slate-500 block">PO Date:</span>
                <span className="font-bold text-slate-700">June 15, 2026</span>
              </div>
              <div>
                <span className="text-slate-500 block">Delivery Terms:</span>
                <span className="font-bold text-slate-700">FOR Destination</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Terms:</span>
                <span className="font-bold text-slate-700">Net 30 Days</span>
              </div>
            </div>

            {/* PO Line Items */}
            <table className="w-full border-collapse border-b mb-10">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-600">
                  <th className="p-2.5 text-left border">Item #</th>
                  <th className="p-2.5 text-left border">Description</th>
                  <th className="p-2.5 text-right border">Qty (MT)</th>
                  <th className="p-2.5 text-right border">Unit Price (₹)</th>
                  <th className="p-2.5 text-right border">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2.5 border">1</td>
                  <td className="p-2.5 border font-semibold">Raw material contract delivery - Order no: {docViewer.orderNo}</td>
                  <td className="p-2.5 text-right border">250.00</td>
                  <td className="p-2.5 text-right border">₹45,000.00</td>
                  <td className="p-2.5 text-right border font-bold">₹1,12,50,000.00</td>
                </tr>
              </tbody>
            </table>

            {/* PO Summary */}
            <div className="flex justify-between items-start mt-6">
              <div className="w-1/2">
                <h4 className="font-bold text-slate-700">Instructions:</h4>
                <ul className="list-disc pl-4 mt-2 text-[10px] space-y-1 text-slate-500">
                  <li>Bilty Copy and Weight Slip must accompany invoice.</li>
                  <li>Logistics transporter details must be updated in portal.</li>
                  <li>Subject to terms of contract RM-FMS.</li>
                </ul>
              </div>
              <div className="w-1/3 text-right space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹1,12,50,000.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span>₹10,12,500.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span>₹10,12,500.00</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-slate-900 text-sm">
                  <span>Total Payable:</span>
                  <span>₹1,32,75,000.00</span>
                </div>
              </div>
            </div>

            {/* PO Signatures */}
            <div className="flex justify-between items-end mt-16 pt-6 border-t">
              <div className="text-center w-1/3 border-t border-dashed pt-2">
                <span className="block text-slate-500 text-[10px]">Prepared By</span>
                <span className="font-bold text-slate-700">Sales Desk Coordinator</span>
              </div>
              <div className="text-center w-1/3 border-t border-dashed pt-2">
                <span className="block text-slate-500 text-[10px]">Authorized Signature</span>
                <div className="h-6 flex items-center justify-center text-xs font-serif italic text-blue-800">
                  Apex Procurements Ltd.
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Bilty':
        return (
          <div className="bg-orange-50/20 text-orange-950 p-8 shadow-md rounded-sm border border-orange-200/50 w-full min-h-[700px] text-xs font-sans">
            {/* Lorry Receipt Header */}
            <div className="text-center border-b border-orange-200 pb-4">
              <h1 className="text-xl font-bold uppercase tracking-wider text-orange-900">LORRY RECEIPT (BILTY)</h1>
              <p className="text-[9px] text-orange-700">SUBJECT TO NEW DELHI JURISDICTION</p>
              <h2 className="text-base font-bold text-orange-900 mt-1">FASTTRACK CARGO CARRIER</h2>
              <p>Head Office: 204 Logistics Tower, Transport Nagar, New Delhi</p>
            </div>

            {/* Bilty Details */}
            <div className="grid grid-cols-2 border border-orange-200 my-6 divide-x divide-orange-200">
              <div className="p-4 space-y-2">
                <p><span className="font-bold">Bilty No:</span> {docViewer.fileName.replace('.pdf','') || 'BL-990812'}</p>
                <p><span className="font-bold">Date:</span> June 16, 2026</p>
                <p><span className="font-bold">Consignor (Sender):</span> Sale Of Raw Material FMS Depot</p>
                <p><span className="font-bold">Consignee (Receiver):</span> Apex Steel Industries Ltd.</p>
              </div>
              <div className="p-4 space-y-2">
                <p><span className="font-bold">Order Ref:</span> {docViewer.orderNo}</p>
                <p><span className="font-bold">Truck No:</span> MH-12-PQ-9876</p>
                <p><span className="font-bold">From:</span> Mumbai Depot-1</p>
                <p><span className="font-bold">To:</span> New Delhi Plant-2</p>
              </div>
            </div>

            {/* Material Manifest */}
            <table className="w-full border border-orange-200 mb-6 text-center">
              <thead>
                <tr className="bg-orange-100/50 text-[10px] font-bold text-orange-900 border-b border-orange-200">
                  <th className="p-2 border-r border-orange-200">Packages</th>
                  <th className="p-2 border-r border-orange-200">Description of Goods</th>
                  <th className="p-2 border-r border-orange-200">Charged Weight (MT)</th>
                  <th className="p-2 border-r border-orange-200">Rate (₹/MT)</th>
                  <th className="p-2">Freight Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-orange-200">
                  <td className="p-2 border-r border-orange-200">Loose Bulk</td>
                  <td className="p-2 border-r border-orange-200 font-semibold">Bulk Industrial Material (Order: {docViewer.orderNo})</td>
                  <td className="p-2 border-r border-orange-200">250.00 MT</td>
                  <td className="p-2 border-r border-orange-200">₹350.00</td>
                  <td className="p-2 font-bold">₹87,500.00</td>
                </tr>
                <tr className="font-bold bg-orange-50/50">
                  <td colSpan="2" className="p-2 border-r border-orange-200 text-right">TOTAL:</td>
                  <td className="p-2 border-r border-orange-200">250.00 MT</td>
                  <td className="p-2 border-r border-orange-200">-</td>
                  <td className="p-2">₹87,500.00</td>
                </tr>
              </tbody>
            </table>

            {/* Freight Conditions */}
            <div className="grid grid-cols-2 gap-4 border border-orange-200 p-4 rounded-lg">
              <div>
                <p className="font-bold mb-1">Freight Summary:</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span>Basic Freight:</span> <span className="font-bold">₹87,500.00</span></div>
                  <div className="flex justify-between"><span>Loading Charges:</span> <span>₹2,500.00</span></div>
                  <div className="flex justify-between"><span>Toll Tax & Misc:</span> <span>₹1,500.00</span></div>
                  <div className="flex justify-between border-t border-orange-200 pt-1 font-bold text-orange-950">
                    <span>Grand Total:</span> <span>₹91,500.00</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p><span className="font-bold">Freight Status:</span> TO BE BILLED (TO PAY)</p>
                <p><span className="font-bold">Driver Name:</span> Ramesh Singh (Lic: DL-03-201889812)</p>
                <p className="text-[10px] text-orange-800 font-medium">Driver Signature verify stamp: Approved ✔</p>
              </div>
            </div>

            <div className="mt-12 text-center text-[10px] text-orange-700 italic">
              Note: The consignee is requested to verify the cargo net weight slip upon offloading.
            </div>
          </div>
        );

      case 'Invoice':
      default:
        return (
          <div className="bg-white text-slate-800 p-8 shadow-md rounded-sm border border-slate-200 w-full min-h-[700px] text-xs font-sans">
            {/* Commercial Invoice Header */}
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-brand-600 text-white rounded-lg flex items-center justify-center font-bold text-base">F</div>
                  <h2 className="text-base font-bold text-slate-900">Sale Of Raw Material FMS</h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Corporate logistics depot, Area 12</p>
                <p className="text-[10px] text-slate-500">Mumbai, Maharashtra - 400001</p>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">TAX INVOICE</h1>
                <p className="font-bold text-brand-600 mt-1">No: {docViewer.fileName.replace('.pdf','') || 'INV-2026-0001'}</p>
                <p className="text-[9px] text-slate-500">Date: June 18, 2026</p>
              </div>
            </div>

            {/* Invoice Parties */}
            <div className="grid grid-cols-2 gap-6 my-6 border-b pb-6">
              <div>
                <h4 className="font-bold text-slate-500 uppercase text-[9px] mb-1">Billed To (Consignee):</h4>
                <p className="font-bold text-slate-900">Apex Steel Industries Ltd.</p>
                <p>Industrial Estate, Phase III, Sector 4</p>
                <p>New Delhi - 110025</p>
                <p className="mt-1">GISTIN: 07AAACA4491N1ZX</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-500 uppercase text-[9px] mb-1">Order Summary:</h4>
                <p><span className="font-bold">FMS Order No:</span> {docViewer.orderNo}</p>
                <p><span className="font-bold">Purchase Order Ref:</span> PO-{docViewer.orderNo}</p>
                <p><span className="font-bold">Truck Details:</span> MH-12-PQ-9876 (Bilty: BL-990812)</p>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full border-collapse border-b mb-8 text-left">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-600">
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5">HSN Code</th>
                  <th className="p-2.5">Description of Goods</th>
                  <th className="p-2.5 text-right">Qty (MT)</th>
                  <th className="p-2.5 text-right">Rate (₹)</th>
                  <th className="p-2.5 text-right">Taxable Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2.5">1</td>
                  <td className="p-2.5">72085110</td>
                  <td className="p-2.5 font-semibold">Bulk Industrial Raw Material - Steel Grade Plates</td>
                  <td className="p-2.5 text-right font-medium">250.00</td>
                  <td className="p-2.5 text-right">₹45,000.00</td>
                  <td className="p-2.5 text-right font-bold">₹1,12,50,000.00</td>
                </tr>
              </tbody>
            </table>

            {/* Totals & Tax distribution */}
            <div className="flex justify-between items-start mt-6">
              <div className="w-1/2 space-y-4">
                <div>
                  <h4 className="font-bold text-slate-700">Bank Settlement Details:</h4>
                  <p className="mt-1">Bank Name: State Bank of India</p>
                  <p>A/c Name: Sale Of Raw Material FMS Ltd.</p>
                  <p>Account No: 4492100918823 (Current Account)</p>
                  <p>IFSC Code: SBIN0004921</p>
                </div>
                <div className="text-[10px] text-slate-400">
                  Certified that the particulars given above are true and correct. Goods once sold will not be taken back.
                </div>
              </div>
              <div className="w-1/3 text-right space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span>₹1,12,50,000.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Integrated GST (18%):</span>
                  <span>₹20,25,000.00</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-slate-900 text-sm">
                  <span>Total Invoice Value:</span>
                  <span>₹1,32,75,000.00</span>
                </div>
                <div className="bg-slate-50 p-2 text-center rounded border mt-2 text-[10px] text-slate-500 font-bold">
                  Amount in words: One Crore Thirty-Two Lakhs Seventy-Five Thousand Rupees Only.
                </div>
              </div>
            </div>

            {/* Signature & Barcode */}
            <div className="flex justify-between items-end mt-16 pt-6 border-t">
              <div className="text-left w-1/3">
                <div className="h-10 w-24 bg-slate-200 flex items-center justify-center text-[10px] border border-slate-300 font-mono">
                  [ BARCODE ]
                </div>
                <span className="block text-slate-400 text-[9px] mt-1">Generated by FMS Account Panel</span>
              </div>
              <div className="text-center w-1/3 border-t border-dashed pt-2">
                <span className="block text-slate-500 text-[10px]">For Sale Of Raw Material FMS</span>
                <div className="h-6 flex items-center justify-center text-xs font-serif italic text-slate-800">
                  Accounts Controller
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 text-white transition-opacity animate-fade-in no-print">
      
      {/* Top bar controls */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-600 p-2 text-white shadow-md">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading text-slate-100 truncate max-w-xs md:max-w-md">
              {docViewer.fileName}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Order Ref: {docViewer.orderNo} | Type: {docViewer.fileType} Copy
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-slate-400 hover:text-white hover:bg-slate-900 h-9 w-9">
            <ZoomOut className="h-4.5 w-4.5" />
          </Button>
          <span className="text-xs font-semibold text-slate-300 w-12 text-center">
            {zoom}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-slate-400 hover:text-white hover:bg-slate-900 h-9 w-9">
            <ZoomIn className="h-4.5 w-4.5" />
          </Button>

          <div className="mx-2 h-6 w-px bg-slate-800" />

          <Button variant="ghost" size="icon" onClick={handlePrint} className="text-slate-400 hover:text-white hover:bg-slate-900 h-9 w-9">
            <Printer className="h-4.5 w-4.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} className="text-slate-400 hover:text-white hover:bg-slate-900 h-9 w-9">
            <Download className="h-4.5 w-4.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={closeDocument} className="text-red-400 hover:text-red-300 hover:bg-red-950/20 h-9 w-9 ml-2">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Render Panel */}
        <div className="flex-1 overflow-auto bg-slate-900 p-8 flex justify-center items-start">
          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }} 
            className="transition-transform duration-100 ease-out origin-top min-w-[700px] max-w-[850px]"
          >
            {renderDocumentContent()}
          </div>
        </div>

        {/* Right Info pane */}
        <aside className="hidden w-80 border-l border-slate-800 bg-slate-950 p-6 md:flex flex-col gap-6">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold font-heading text-slate-200">
              <Info className="h-4 w-4 text-brand-500" />
              Document Properties
            </h4>
            <div className="mt-4 space-y-3.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>File Name</span>
                <span className="font-semibold text-slate-200 truncate max-w-[150px]">{docViewer.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span>File Type</span>
                <span className="font-semibold text-slate-200">{docViewer.fileType} document</span>
              </div>
              <div className="flex justify-between">
                <span>File Size</span>
                <span className="font-semibold text-slate-200">324.5 KB</span>
              </div>
              <div className="flex justify-between">
                <span>Storage status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Secure Vaulted
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity & Timeline</h4>
            <div className="mt-4 space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold uppercase text-[10px]">
                  S
                </div>
                <div>
                  <p className="text-slate-300 font-semibold">Uploaded by Sales</p>
                  <p className="text-[10px] text-slate-500">June 15, 2026 at 16:10</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold uppercase text-[10px]">
                  A
                </div>
                <div>
                  <p className="text-slate-300 font-semibold">Signed by Accounts</p>
                  <p className="text-[10px] text-slate-500">June 18, 2026 at 11:22</p>
                </div>
              </div>
            </div>
          </div>

          {/* Drive details */}
          <div className="mt-auto rounded-lg bg-slate-900 p-4 border border-slate-800">
            <div className="flex items-start gap-3">
              <HardDrive className="h-5 w-5 text-brand-500" />
              <div>
                <h5 className="text-xs font-bold text-slate-200">Unified Cloud FMS Drive</h5>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                  Documents are safely stored on Supabase Storage Bucket. RLS ensures unauthorized users cannot read files.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
export default DocumentViewer;
