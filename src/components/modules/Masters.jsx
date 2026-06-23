import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  Boxes,
  Database,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog } from '../ui/dialog';
import { useApp } from '../../context/AppContext';
import { cn, formatNumber } from '../../lib/utils';

export const Masters = () => {
  const { addNotification } = useApp();
  const [activeSubTab, setActiveSubTab] = useState('products'); // 'products' | 'parties'
  const [loading, setLoading] = useState(true);

  // Lists State
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [partyModal, setPartyModal] = useState({ open: false, mode: 'create', data: null });
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', data: null });

  // Form states
  const [partyName, setPartyName] = useState('');
  const [prodForm, setProdForm] = useState({ name: '', qty: '', unit: 'MT' });
  
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodList, partyList] = await Promise.all([
        db.getProducts(),
        db.getParties()
      ]);
      setProducts(prodList);
      setParties(partyList);
    } catch (e) {
      console.error("Failed to fetch Master lists", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Party CRUD Handlers ---
  const handleOpenPartyCreate = () => {
    setPartyName('');
    setErrorMsg('');
    setPartyModal({ open: true, mode: 'create', data: null });
  };

  const handleOpenPartyEdit = (party) => {
    setPartyName(party.name);
    setErrorMsg('');
    setPartyModal({ open: true, mode: 'edit', data: party });
  };

  const handleSaveParty = async (e) => {
    e.preventDefault();
    if (!partyName.trim()) {
      setErrorMsg('Party name is required.');
      return;
    }

    try {
      if (partyModal.mode === 'create') {
        await db.createParty(partyName.trim());
        addNotification('Master Registry Updated', `Party "${partyName}" created successfully.`, 'success');
      } else {
        await db.updateParty(partyModal.data.id, partyName.trim());
        addNotification('Master Registry Updated', `Party "${partyName}" updated successfully.`, 'success');
      }
      setPartyModal({ open: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleDeleteParty = async (id, name) => {
    if (!confirm(`Are you sure you want to delete party "${name}"?`)) return;
    try {
      await db.deleteParty(id);
      addNotification('Master Registry Updated', `Party "${name}" deleted.`, 'info');
      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting party.');
    }
  };

  // --- Product CRUD Handlers ---
  const handleOpenProductCreate = () => {
    setProdForm({ name: '', qty: '', unit: 'MT' });
    setErrorMsg('');
    setProductModal({ open: true, mode: 'create', data: null });
  };

  const handleOpenProductEdit = (prod) => {
    setProdForm({ name: prod.name, qty: prod.available_qty, unit: prod.unit });
    setErrorMsg('');
    setProductModal({ open: true, mode: 'edit', data: prod });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const { name, qty, unit } = prodForm;
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    const qtyVal = parseFloat(qty);
    if (isNaN(qtyVal) || qtyVal < 0) {
      setErrorMsg('Please enter a valid stock quantity (>= 0).');
      return;
    }

    try {
      if (productModal.mode === 'create') {
        await db.createProduct(name.trim(), qtyVal, unit);
        addNotification('Master Registry Updated', `Product "${name}" created successfully.`, 'success');
      } else {
        await db.updateProduct(productModal.data.id, name.trim(), qtyVal, unit);
        addNotification('Master Registry Updated', `Product "${name}" updated successfully.`, 'success');
      }
      setProductModal({ open: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await db.deleteProduct(id);
      addNotification('Master Registry Updated', `Product "${name}" deleted.`, 'info');
      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting product.');
    }
  };

  // Filter lists based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Master Registry Management
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Configure primary products specifications and vendor profiles (Party directory).
          </p>
        </div>
      </div>

      {/* Split Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-1 border-slate-100 dark:border-slate-navy-800">
        
        {/* Toggle subtab buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveSubTab('products'); setSearchQuery(''); }}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
              activeSubTab === 'products'
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/10"
                : "text-slate-navy-600 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900"
            )}
          >
            <Boxes className="h-4.5 w-4.5" />
            Product Master
            <span className="ml-1 text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-bold">
              {products.length}
            </span>
          </button>
          
          <button
            onClick={() => { setActiveSubTab('parties'); setSearchQuery(''); }}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
              activeSubTab === 'parties'
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/10"
                : "text-slate-navy-600 hover:bg-slate-50 dark:text-slate-navy-400 dark:hover:bg-slate-navy-900"
            )}
          >
            <User className="h-4.5 w-4.5" />
            Party Master
            <span className="ml-1 text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-bold">
              {parties.length}
            </span>
          </button>
        </div>

        {/* Search and Action bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-navy-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeSubTab}...`}
              className="pl-9 pr-4 py-1.5 w-56 rounded-lg border border-slate-navy-200 bg-white text-xs text-slate-navy-900 focus:border-brand-500 focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-100"
            />
          </div>

          <Button 
            onClick={activeSubTab === 'products' ? handleOpenProductCreate : handleOpenPartyCreate}
            className="gap-1.5 shadow-xs"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {activeSubTab === 'products' ? 'Add Product' : 'Add Party'}
          </Button>
        </div>

      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-slate-100/50 overflow-hidden">
          
          {/* Products List Table */}
          {activeSubTab === 'products' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">UUID Index</th>
                    <th className="p-4">Product Specification Name</th>
                    <th className="p-4 text-right">Available Stock</th>
                    <th className="p-4">Unit Type</th>
                    <th className="p-4 text-center">Modify Operations</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50 dark:divide-slate-navy-900">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-navy-400">
                        No product master records found. Click 'Add Product' to build inventory.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-navy-900/30">
                        <td className="p-4 font-mono text-[10px] text-slate-navy-400">{prod.id}</td>
                        <td className="p-4 font-bold text-slate-navy-850 dark:text-slate-navy-200">{prod.name}</td>
                        <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">
                          {formatNumber(prod.available_qty, 2)}
                        </td>
                        <td className="p-4 font-medium text-slate-navy-500">{prod.unit}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenProductEdit(prod)}
                              className="h-7 w-7 text-brand-650 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/20"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Parties List Table */}
          {activeSubTab === 'parties' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-navy-600 dark:bg-slate-navy-900 dark:border-slate-navy-800 dark:text-slate-navy-400">
                    <th className="p-4">UUID Index</th>
                    <th className="p-4">Party / Vendor Registered Name</th>
                    <th className="p-4 text-center">Modify Operations</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50 dark:divide-slate-navy-900">
                  {filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-slate-navy-400">
                        No registered vendor or party profiles found.
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map(party => (
                      <tr key={party.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-navy-900/30">
                        <td className="p-4 font-mono text-[10px] text-slate-navy-400">{party.id}</td>
                        <td className="p-4 font-bold text-slate-navy-850 dark:text-slate-navy-200">{party.name}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenPartyEdit(party)}
                              className="h-7 w-7 text-brand-650 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/20"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteParty(party.id, party.name)}
                              className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* --- Dialog Modals --- */}

      {/* Product Dialog */}
      <Dialog
        isOpen={productModal.open}
        onClose={() => setProductModal({ open: false, mode: 'create', data: null })}
        title={productModal.mode === 'create' ? 'Register New Product Specification' : 'Modify Product Master Record'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {errorMsg}
            </div>
          )}

          <Input
            label="Product Name Specification"
            value={prodForm.name}
            onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
            placeholder="e.g. Steam Coal Grade C"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Initial Stock Quantity"
              type="number"
              step="any"
              value={prodForm.qty}
              onChange={(e) => setProdForm({ ...prodForm, qty: e.target.value })}
              placeholder="e.g. 5000"
              disabled={productModal.mode === 'edit'} // quantity cannot be edited directly (managed by logs/inventory)
              helperText={productModal.mode === 'edit' ? 'Stock is adjusted via inventory flows.' : 'Starting stock balance.'}
            />

            <Select
              label="Tonnage Unit of Measure"
              value={prodForm.unit}
              onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
              options={[
                { value: 'MT', label: 'Metric Tons (MT)' },
                { value: 'KG', label: 'Kilograms (Kgs)' },
                { value: 'CFT', label: 'Cubic Feet (CFT)' }
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setProductModal({ open: false, mode: 'create', data: null })}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Specification
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Party Dialog */}
      <Dialog
        isOpen={partyModal.open}
        onClose={() => setPartyModal({ open: false, mode: 'create', data: null })}
        title={partyModal.mode === 'create' ? 'Register New Party Profile' : 'Modify Party Profile'}
      >
        <form onSubmit={handleSaveParty} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {errorMsg}
            </div>
          )}

          <Input
            label="Party Name"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="e.g. Apex Infrastructures Ltd."
          />

          <div className="flex justify-end gap-2 border-t pt-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setPartyModal({ open: false, mode: 'create', data: null })}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Profile
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
export default Masters;
