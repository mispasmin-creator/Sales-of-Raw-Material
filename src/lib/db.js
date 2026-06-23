// DB Router: Automatically switches between Live Supabase and LocalStorage Mock database
import { createClient } from '@supabase/supabase-js';
import { mockDb } from './mockDb';

// Initialize Mock LocalStorage DB
mockDb.init();

class DatabaseService {
  constructor() {
    this.supabase = null;
    this.useSupabase = false;
    this.masterCache = null;
    this.initSupabase();
  }

  initSupabase() {
    // Check environment variables
    let url = import.meta.env.VITE_SUPABASE_URL;
    let key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Fallback to client-defined settings in LocalStorage
    const storedConfig = localStorage.getItem('fms_supabase_config');
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        if (parsed.url && parsed.key) {
          url = parsed.url;
          key = parsed.key;
        }
      } catch (e) {
        console.error("Failed to parse stored Supabase config", e);
      }
    }

    if (url && key && url !== 'YOUR_SUPABASE_URL' && key !== 'YOUR_SUPABASE_ANON_KEY') {
      try {
        this.supabase = createClient(url, key);
        this.useSupabase = true;
        console.log("Database Service: Connected to Live Supabase at", url);
      } catch (e) {
        console.error("Database Service: Failed to initialize Supabase client", e);
        this.useSupabase = false;
      }
    } else {
      this.useSupabase = false;
      console.log("Database Service: Supabase credentials missing. Routing to LocalStorage Mock Database.");
    }
  }

  base64ToBlob(base64, mimeType = 'application/octet-stream') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  async uploadToSupabaseStorage(base64Data, fileName, mimeType) {
    if (!base64Data) return '';
    try {
      const blob = this.base64ToBlob(base64Data, mimeType);
      const bucketName = 'Sales of Raw Material Image';
      const filePath = `Images/${Date.now()}_${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: true
        });
        
      if (error) throw error;
      
      const { data: urlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (e) {
      console.error("Supabase Storage Upload Error:", e);
      throw e;
    }
  }

  isSupabaseConnected() {
    return this.useSupabase;
  }

  getSupabaseConfig() {
    const storedConfig = localStorage.getItem('fms_supabase_config');
    if (storedConfig) {
      return JSON.parse(storedConfig);
    }
    return {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  }

  setSupabaseConfig(url, key) {
    if (!url || !key) {
      localStorage.removeItem('fms_supabase_config');
    } else {
      localStorage.setItem('fms_supabase_config', JSON.stringify({ url, key }));
    }
    this.initSupabase();
    return this.useSupabase;
  }

  // Simulated latency for smooth UX skeleton triggers in mock mode
  async delay() {
    if (!this.useSupabase) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async getGoogleSheetMasters() {
    if (this.masterCache) {
      return this.masterCache;
    }

    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (!url || url === 'YOUR_APPSCRIPT_URL' || url === '') {
      return null;
    }

    try {
      console.log("Database Service: Fetching live Master list from Google Sheet...");
      const response = await fetch(`${url}?sheetName=Master`);
      const result = await response.json();
      if (result && result.status === 'success' && Array.isArray(result.data)) {
        const firmsSet = new Set();
        const partiesSet = new Set();
        const productsSet = new Set();

        result.data.forEach(row => {
          const firm = row["Firm Name"] ? row["Firm Name"].toString().trim() : "";
          const party = row["Party Name"] ? row["Party Name"].toString().trim() : "";
          const product = row["Product Name"] ? row["Product Name"].toString().trim() : "";

          if (firm) firmsSet.add(firm);
          if (party) partiesSet.add(party);
          if (product) productsSet.add(product);
        });

        this.masterCache = {
          firms: Array.from(firmsSet).sort(),
          parties: Array.from(partiesSet).sort().map(name => ({
            id: name,
            name: name
          })),
          products: Array.from(productsSet).sort().map(name => ({
            id: name,
            name: name,
            available_qty: 999999.0,
            unit: 'MT'
          }))
        };
        return this.masterCache;
      }
    } catch (e) {
      console.error("Database Service: Failed to fetch Master list from Google Sheet", e);
    }
    return null;
  }

  async getFirms() {
    await this.delay();
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase
          .from('masters')
          .select('firm_name')
          .not('firm_name', 'is', null);
        if (error) throw error;
        return Array.from(new Set(
          data
            .map(d => d.firm_name?.toString().trim())
            .filter(Boolean)
        )).sort();
      } catch (e) {
        console.error("Supabase getFirms failed:", e);
        return [];
      }
    }
    if (!this.useSupabase) {
      const masters = await this.getGoogleSheetMasters();
      if (masters && masters.firms.length > 0) {
        return masters.firms;
      }
    }
    return [];
  }

  // --- Parties ---
  async getParties() {
    await this.delay();
    if (!this.useSupabase) {
      const masters = await this.getGoogleSheetMasters();
      if (masters && masters.parties.length > 0) {
        return masters.parties;
      }
    }
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase
          .from('masters')
          .select('party_name')
          .not('party_name', 'is', null);
        if (error) throw error;
        
        const seen = new Set();
        const uniqueParties = [];
        data.forEach(d => {
          const name = d.party_name?.toString().trim();
          if (name && !seen.has(name)) {
            seen.add(name);
            uniqueParties.push({
              id: name,
              name: name
            });
          }
        });
        return uniqueParties.sort((a, b) => a.name.localeCompare(b.name));
      } catch (e) {
        console.error("Supabase getParties failed:", e);
        return mockDb.getParties();
      }
    }
    return mockDb.getParties();
  }

  async createParty(name) {
    await this.delay();
    if (this.useSupabase) {
      const { data, error } = await this.supabase
        .from('masters')
        .insert([{ party_name: name }])
        .select();
      if (error) throw error;
      await this.addLog('Admin', `Party Created: ${name}`, { id: data[0].id });
      return { id: name, name };
    }
    return mockDb.createParty(name);
  }

  async updateParty(id, name) {
    await this.delay();
    if (this.useSupabase) {
      const { data, error } = await this.supabase
        .from('masters')
        .update({ party_name: name })
        .eq('party_name', id)
        .select();
      if (error) throw error;
      await this.addLog('Admin', `Party Updated: ${name}`, { old_name: id, name });
      return { id: name, name };
    }
    // Mock / fallback logic
    const partiesList = JSON.parse(localStorage.getItem('fms_parties') || '[]');
    const idx = partiesList.findIndex(p => p.id === id);
    if (idx !== -1) {
      partiesList[idx].name = name;
      localStorage.setItem('fms_parties', JSON.stringify(partiesList));
    }
    return { id: name, name };
  }

  async deleteParty(id) {
    await this.delay();
    if (this.useSupabase) {
      // Check if linked to orders
      const { data: linkedOrders, error: orderErr } = await this.supabase
        .from('orders')
        .select('id')
        .eq('party_name', id)
        .limit(1);
      if (orderErr) throw orderErr;
      if (linkedOrders && linkedOrders.length > 0) {
        throw new Error("Cannot delete party because it is linked to active sale orders.");
      }

      const { error } = await this.supabase
        .from('masters')
        .delete()
        .eq('party_name', id);
      if (error) throw error;
      await this.addLog('Admin', `Party Deleted`, { party_name: id });
      return;
    }
    return mockDb.deleteParty(id);
  }

  // --- Products ---
  async getProducts() {
    await this.delay();
    if (!this.useSupabase) {
      const masters = await this.getGoogleSheetMasters();
      if (masters && masters.products.length > 0) {
        return masters.products;
      }
    }
    if (this.useSupabase) {
      try {
        // 1. Fetch unique product names from masters
        const { data: mastersData, error: mastersErr } = await this.supabase
          .from('masters')
          .select('product_name')
          .not('product_name', 'is', null);
        if (mastersErr) throw mastersErr;

        // 2. Fetch inventory values to merge stock details
        let inventoryData = [];
        try {
          const { data, error: inventoryErr } = await this.supabase
            .from('inventory')
            .select('*');
          if (!inventoryErr && data) {
            inventoryData = data;
          }
        } catch (e) {
          console.warn("Failed to fetch inventory, using empty array fallback:", e);
        }

        const uniqueNames = Array.from(new Set(
          mastersData
            .map(m => m.product_name?.toString().trim())
            .filter(Boolean)
        )).sort();

        return uniqueNames.map(name => {
          const inv = inventoryData.find(i => 
            (i.product_name && i.product_name.toString().trim() === name) ||
            (i.product_id && i.product_id.toString().trim() === name)
          );
          return {
            id: name,
            name: name,
            available_qty: inv ? parseFloat(inv.available_qty || 0) : 0.0,
            unit: inv ? (inv.unit || 'MT') : 'MT'
          };
        });
      } catch (err) {
        console.error("Supabase getProducts failed:", err);
        return mockDb.getProducts();
      }
    }
    return mockDb.getProducts();
  }

  async createProduct(name, availableQty, unit) {
    await this.delay();
    if (this.useSupabase) {
      const qtyNum = parseFloat(availableQty) || 0;
      
      // 1. Insert into masters
      const { error: masterErr } = await this.supabase
        .from('masters')
        .insert([{ product_name: name }]);
      if (masterErr) throw masterErr;

      // 2. Insert into inventory (try product_name first, then product_id fallback)
      try {
        const { error } = await this.supabase
          .from('inventory')
          .insert([{
            product_name: name,
            available_qty: qtyNum,
            sold_qty: 0,
            unit: unit || 'MT'
          }]);
        if (error) {
          await this.supabase
            .from('inventory')
            .insert([{
              product_id: name,
              available_qty: qtyNum,
              sold_qty: 0,
              unit: unit || 'MT'
            }]);
        }
      } catch (err) {
        console.warn("Inventory record creation skipped or failed:", err);
      }

      await this.addLog('Admin', `Product Created: ${name}`, { product_name: name, available_qty: qtyNum });
      return {
        id: name,
        name: name,
        available_qty: qtyNum,
        unit: unit || 'MT'
      };
    }
    return mockDb.createProduct(name, availableQty, unit);
  }

  async updateProduct(id, name, availableQty, unit) {
    await this.delay();
    if (this.useSupabase) {
      const qtyNum = parseFloat(availableQty) || 0;
      
      // 1. Update in masters
      const { error: masterErr } = await this.supabase
        .from('masters')
        .update({ product_name: name })
        .eq('product_name', id);
      if (masterErr) throw masterErr;

      // 2. Update in inventory
      try {
        const { error } = await this.supabase
          .from('inventory')
          .update({
            product_name: name,
            available_qty: qtyNum,
            unit
          })
          .eq('product_name', id);
        if (error) {
          await this.supabase
            .from('inventory')
            .update({
              product_id: name,
              available_qty: qtyNum,
              unit
            })
            .eq('product_id', id);
        }
      } catch (err) {
        console.warn("Inventory record update failed:", err);
      }

      await this.addLog('Admin', `Product Updated: ${name}`, { old_name: id, name, available_qty: qtyNum });
      return {
        id: name,
        name: name,
        available_qty: qtyNum,
        unit
      };
    }
    return mockDb.updateProduct(id, name, availableQty, unit);
  }

  async deleteProduct(id) {
    await this.delay();
    if (this.useSupabase) {
      // Check if linked to orders
      const { data: linkedOrders, error: orderErr } = await this.supabase
        .from('orders')
        .select('id')
        .eq('product_name', id)
        .limit(1);
      if (orderErr) throw orderErr;
      if (linkedOrders && linkedOrders.length > 0) {
        throw new Error("Cannot delete product because it is linked to active sale orders.");
      }

      // 1. Delete from masters
      const { error: masterErr } = await this.supabase
        .from('masters')
        .delete()
        .eq('product_name', id);
      if (masterErr) throw masterErr;

      // 2. Delete from inventory
      try {
        const { error } = await this.supabase
          .from('inventory')
          .delete()
          .eq('product_name', id);
        if (error) {
          await this.supabase
            .from('inventory')
            .delete()
            .eq('product_id', id);
        }
      } catch (err) {
        console.warn("Inventory record delete failed:", err);
      }

      await this.addLog('Admin', `Product Deleted`, { product_name: id });
      return;
    }
    return mockDb.deleteProduct(id);
  }

  // --- Orders ---
  async getOrders() {
    await this.delay();

    // Try to fetch from Google Sheet Apps Script first!
    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (url && url !== 'YOUR_APPSCRIPT_URL' && url !== '') {
      try {
        console.log("Database Service: Fetching live orders from Google Sheet...");
        const response = await fetch(url);
        const result = await response.json();
        
        if (result && result.status === 'success' && Array.isArray(result.data)) {
          // Resolve logistics and invoicing to track dynamic status in-app
          const [logsList, invsList] = await Promise.all([
            this.getLogistics(),
            this.getInvoices()
          ]);

          const mappedOrders = result.data
            .filter(row => row["Order No."] && row["Order No."].toString().trim().toUpperCase().startsWith("RM"))
            .map((row, index) => {
              const qty = parseFloat(row["Qty"]) || 0;
              const rate = parseFloat(row["Rate"]) || 0;
              const orderNo = row["Order No."];
              const orderId = `order_${orderNo}`;

              // Check dynamic status workflow
              let hasLogistics = logsList.some(l => l.order_no === orderNo);
              let hasInvoice = invsList.some(i => i.order_no === orderNo);

              // If Google Sheet is used, check if the columns are actually populated
              const sheetHasLogistics = row["Actual"] && row["Actual"].toString().trim() !== "";
              const sheetHasInvoice = row["Actual."] && row["Actual."].toString().trim() !== "";

              // If Google Sheet does not have logistics/invoice, override local storage values to false
              // BUT only if the local entry is not very new (to avoid race conditions during sync)
              if (!sheetHasLogistics) {
                const localLog = logsList.find(l => l.order_no === orderNo);
                const isNew = localLog && (Date.now() - new Date(localLog.created_at).getTime() < 15000); // 15 seconds grace period
                if (!isNew) {
                  hasLogistics = false;
                  // Delete from localStorage to keep it in sync
                  const localLogs = JSON.parse(localStorage.getItem('fms_logistics') || '[]');
                  const filteredLogs = localLogs.filter(l => l.order_no !== orderNo);
                  if (localLogs.length !== filteredLogs.length) {
                    localStorage.setItem('fms_logistics', JSON.stringify(filteredLogs));
                  }
                }
              }
              if (!sheetHasInvoice) {
                const localInv = invsList.find(i => i.order_no === orderNo);
                const isNew = localInv && (Date.now() - new Date(localInv.created_at).getTime() < 15000); // 15 seconds grace period
                if (!isNew) {
                  hasInvoice = false;
                  // Delete from localStorage to keep it in sync
                  const localInvoices = JSON.parse(localStorage.getItem('fms_invoices') || '[]');
                  const filteredInvoices = localInvoices.filter(i => i.order_no !== orderNo);
                  if (localInvoices.length !== filteredInvoices.length) {
                    localStorage.setItem('fms_invoices', JSON.stringify(filteredInvoices));
                  }
                }
              }

              const isApproved = hasLogistics || hasInvoice || localStorage.getItem('fms_approved_' + orderNo) === 'true';
              
              let status = "Pending Approval";
              if (isApproved) {
                if (hasLogistics && hasInvoice) {
                  status = "Completed";
                } else if (hasLogistics) {
                  status = "Pending Invoice";
                } else {
                  status = "Pending Logistics";
                }
              }

              return {
                id: orderId,
                order_no: orderNo,
                firm_name: row["Firm Name"] || "",
                party_name: row["Party Name"] || "",
                product_name: row["Product Name"] || "",
                qty: qty,
                rate: rate,
                amount: qty * rate,
                transport_type: row["Type Of Transporting"] || "FOR",
                dispatch_date: row["Date Of Dispatch"] 
                  ? new Date(row["Date Of Dispatch"]).toISOString().split('T')[0] 
                  : new Date().toISOString().split('T')[0],
                po_copy_url: row["PO Copy"] || "",
                status: status,
                created_at: row["Timestamp"] || new Date().toISOString(),
                updated_at: row["Timestamp"] || new Date().toISOString()
              };
            });

          const localOrders = mockDb.getOrders();
          const unsyncedOrders = [];
          
          localOrders.forEach(lo => {
            const isSynced = mappedOrders.some(mo => mo.order_no === lo.order_no);
            if (isSynced) return;

            // Check if order was created in the last 15 seconds (still syncing)
            const isNew = (Date.now() - new Date(lo.created_at).getTime() < 15000);
            if (isNew) {
              unsyncedOrders.push(lo);
            } else {
              // Delete old unsynced orders from local storage since they were deleted from Google Sheet
              const localAll = JSON.parse(localStorage.getItem('fms_orders') || '[]');
              const filtered = localAll.filter(o => o.order_no !== lo.order_no);
              localStorage.setItem('fms_orders', JSON.stringify(filtered));
            }
          });

          const combined = [...unsyncedOrders, ...mappedOrders];
          combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return combined;
        }
      } catch (e) {
        console.error("Database Service: Failed to fetch orders from Google Sheet", e);
      }
    }

    if (this.useSupabase) {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      return data.map(o => ({
        ...o,
        party_name: o.party_name || 'Unknown',
        product_name: o.product_name || 'Unknown'
      }));
    }
    return mockDb.getOrders();
  }

  async createOrder(orderData, userRole) {
    await this.delay();
    
    // Separate base64 file data from DB data to avoid local storage overflow
    const { po_file_base64, po_file_name, po_file_type, ...dbOrderData } = orderData;

    if (this.useSupabase) {
      // Check count to generate Serial Number
      const { count, error: countErr } = await this.supabase.from('orders').select('*', { count: 'exact', head: true });
      if (countErr) throw countErr;
      const orderNo = `RM-${String((count || 0) + 1).padStart(4, '0')}`;
      const qty = parseFloat(orderData.qty);

      // Get product for stock warning check from inventory (bypassed if missing or errors out)
      // Using a standard query instead of .single() to avoid 406 network errors in the browser console
      let isStockWarning = false;
      try {
        const { data: prodList, error: prodErr } = await this.supabase.from('inventory').select('*').eq('product_name', orderData.product_id);
        if (!prodErr && prodList && prodList.length > 0) {
          const prod = prodList[0];
          isStockWarning = prod.remaining_qty < qty;
        }
      } catch (err) {
        console.warn("Stock warning check bypassed:", err);
      }

      let poCopyUrl = orderData.po_copy_url || '';
      if (po_file_base64 && po_file_name) {
        poCopyUrl = await this.uploadToSupabaseStorage(
          po_file_base64,
          po_file_name,
          po_file_type
        );
      }

      const { data, error } = await this.supabase.from('orders').insert([{
        order_no: orderNo,
        firm_name: orderData.firm_name,
        party_name: orderData.party_id,
        product_name: orderData.product_id,
        qty,
        rate: parseFloat(orderData.rate),
        transport_type: orderData.transport_type,
        dispatch_date: orderData.dispatch_date,
        po_copy_url: poCopyUrl,
        status: 'Pending Approval'
      }]).select();
      if (error) throw error;

      await this.addLog(userRole || 'Sales', `Sale Order ${orderNo} Created`, { 
        order_no: orderNo,
        qty, 
        stock_warned: isStockWarning 
      });

      const result = { order: data[0], warned: isStockWarning };
      
      // Async sync to Google Sheet
      this.syncOrderToGoogleSheet({
        order_no: orderNo,
        firm_name: orderData.firm_name,
        party_name: orderData.party_id,
        product_name: orderData.product_id,
        qty,
        rate: parseFloat(orderData.rate),
        transport_type: orderData.transport_type,
        dispatch_date: orderData.dispatch_date,
        po_copy_url: poCopyUrl,
        po_file_base64,
        po_file_name,
        po_file_type
      });

      return result;
    }

    // Fetch live orders first to generate the correct serial number
    const liveOrders = await this.getOrders();
    const count = liveOrders.length + 1;
    const orderNo = `RM-${String(count).padStart(4, '0')}`;

    const result = mockDb.createOrder(dbOrderData, userRole, orderNo);
    
    // Sync to Google Sheet and await it so frontend doesn't refresh before sheet is updated
    await this.syncOrderToGoogleSheet({
      order_no: result.order.order_no,
      firm_name: result.order.firm_name,
      party_name: result.order.party_name,
      product_name: result.order.product_name,
      qty: result.order.qty,
      rate: result.order.rate,
      transport_type: result.order.transport_type,
      dispatch_date: result.order.dispatch_date,
      po_copy_url: result.order.po_copy_url || '',
      po_file_base64,
      po_file_name,
      po_file_type
    });

    return result;
  }

  async approveOrder(orderNo, approve, userRole) {
    await this.delay();
    const newStatus = approve ? 'Pending Logistics' : 'Pending Approval';
    if (this.useSupabase) {
      const { data, error } = await this.supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_no', orderNo)
        .select();
      if (error) throw error;
      
      await this.addLog(userRole || 'Admin', `Order ${orderNo} ${approve ? 'Approved' : 'Approval Revoked'}`, {
        order_no: orderNo,
        status: newStatus
      });
      return data[0];
    }
    // Mock / Google Sheet fallback
    if (approve) {
      localStorage.setItem('fms_approved_' + orderNo, 'true');
    } else {
      localStorage.removeItem('fms_approved_' + orderNo);
    }
    return { order_no: orderNo, status: newStatus };
  }

  // --- Logistics ---
  async getLogistics() {
    await this.delay();
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('logistics').select('*');
      if (error) throw error;
      return data;
    }
    return mockDb.getLogistics();
  }

  async saveLogistics(logisticsData, userRole) {
    await this.delay();

    // Resolve order_no to sync to sheet
    const orders = await this.getOrders();
    const orderObj = orders.find(o => o.id === logisticsData.order_id);
    const orderNo = orderObj ? orderObj.order_no : "";

    if (this.useSupabase) {
      const actualTruckQty = parseFloat(logisticsData.actual_truck_qty);
      const rateValue = parseFloat(logisticsData.rate_value);
      
      let freightAmount = 0;
      if (logisticsData.rate_type === 'Fixed') {
        freightAmount = rateValue;
      } else {
        freightAmount = actualTruckQty * rateValue;
      }

      let biltyCopyUrl = logisticsData.bilty_copy_url || '';
      if (logisticsData.bilty_file_base64 && logisticsData.bilty_file_name) {
        biltyCopyUrl = await this.uploadToSupabaseStorage(
          logisticsData.bilty_file_base64,
          logisticsData.bilty_file_name,
          logisticsData.bilty_file_type
        );
      }

      // Step 1: Save logistics details
      const { data: logData, error: logErr } = await this.supabase.from('logistics').insert([{
        order_id: logisticsData.order_id,
        transporter_name: logisticsData.transporter_name,
        truck_no: logisticsData.truck_no,
        bilty_no: logisticsData.bilty_no,
        actual_truck_qty: actualTruckQty,
        bilty_copy_url: biltyCopyUrl,
        rate_type: logisticsData.rate_type,
        rate_value: rateValue,
        freight_amount: freightAmount
      }]).select();
      if (logErr) throw logErr;

      // Step 2: Update Order Status
      const updatePayload = {
        status: 'Pending Invoice',
        updated_at: new Date().toISOString()
      };
      if (logisticsData.transport_type) {
        updatePayload.transport_type = logisticsData.transport_type;
      }
      const { data: ordData, error: ordErr } = await this.supabase.from('orders').update(updatePayload).eq('id', logisticsData.order_id).select();
      if (ordErr) throw ordErr;

      await this.addLog(userRole || 'Logistics', `Logistics Added for Order ${ordData[0].order_no}`, {
        order_no: ordData[0].order_no,
        transporter: logisticsData.transporter_name,
        freight: freightAmount,
        description: logisticsData.description || '',
        transport_type: logisticsData.transport_type || ordData[0].transport_type
      });

      // Sync to Google Sheet
      this.syncLogisticsToGoogleSheet({
        ...logisticsData,
        order_no: orderNo
      });

      return logData[0];
    }

    const result = mockDb.saveLogistics({
      ...logisticsData,
      order_no: orderNo,
      qty: orderObj ? orderObj.qty : 0
    }, userRole);

    // Sync to Google Sheet and await it
    await this.syncLogisticsToGoogleSheet({
      ...logisticsData,
      order_no: orderNo
    });

    return result;
  }

  // --- Invoices ---
  async getInvoices() {
    await this.delay();
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('invoices').select('*');
      if (error) throw error;
      return data;
    }
    return mockDb.getInvoices();
  }

  async saveInvoice(invoiceData, userRole) {
    await this.delay();

    // Resolve order_no to sync to sheet
    const orders = await this.getOrders();
    const orderObj = orders.find(o => o.id === invoiceData.order_id);
    const orderNo = orderObj ? orderObj.order_no : "";

    if (this.useSupabase) {
      // Check duplicate invoice number
      const { data: dup, error: dupErr } = await this.supabase.from('invoices').select('id').eq('invoice_no', invoiceData.invoice_no).limit(1);
      if (dupErr) throw dupErr;
      if (dup && dup.length > 0) {
        throw new Error(`Invoice No "${invoiceData.invoice_no}" already exists.`);
      }

      let invoiceCopyUrl = invoiceData.invoice_copy_url || '';
      if (invoiceData.invoice_file_base64 && invoiceData.invoice_file_name) {
        invoiceCopyUrl = await this.uploadToSupabaseStorage(
          invoiceData.invoice_file_base64,
          invoiceData.invoice_file_name,
          invoiceData.invoice_file_type
        );
      }

      // Step 1: Save invoice
      const { data: invData, error: invErr } = await this.supabase.from('invoices').insert([{
        order_id: invoiceData.order_id,
        invoice_no: invoiceData.invoice_no,
        invoice_copy_url: invoiceCopyUrl
      }]).select();
      if (invErr) throw invErr;

      // Step 2: Update Order Status to Completed (triggers auto stock deduction trigger in Postgres)
      const { data: ordData, error: ordErr } = await this.supabase.from('orders').update({
        status: 'Completed',
        updated_at: new Date().toISOString()
      }).eq('id', invoiceData.order_id).select();
      if (ordErr) throw ordErr;

      await this.addLog(userRole || 'Accounts', `Invoice Created: ${invoiceData.invoice_no}`, {
        order_no: ordData[0].order_no,
        invoice_no: invoiceData.invoice_no
      });

      // Sync to Google Sheet
      this.syncInvoiceToGoogleSheet({
        ...invoiceData,
        order_no: orderNo
      });

      return invData[0];
    }
    
    const result = mockDb.saveInvoice({
      ...invoiceData,
      order_no: orderNo,
      product_id: orderObj ? orderObj.product_id : '',
      qty: orderObj ? orderObj.qty : 0
    }, userRole);

    // Sync to Google Sheet and await it
    await this.syncInvoiceToGoogleSheet({
      ...invoiceData,
      order_no: orderNo
    });

    return result;
  }

  // --- Inventory ---
  async getInventory() {
    await this.delay();
    if (this.useSupabase) {
      // In live Supabase mode, we pull from inventory directly
      const { data, error } = await this.supabase
        .from('inventory')
        .select('*');
      if (error) throw error;

      return data.map(i => ({
        product_id: i.product_name,
        product_name: i.product_name || 'Unknown',
        available_qty: i.available_qty,
        sold_qty: i.sold_qty,
        remaining_qty: i.remaining_qty,
        unit: i.unit || 'MT'
      }));
    }
    return mockDb.getInventory();
  }

  // --- Logs ---
  async getLogs() {
    await this.delay();
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return mockDb.getLogs();
  }

  async addLog(userRole, action, details = {}) {
    if (this.useSupabase) {
      try {
        await this.supabase.from('activity_logs').insert([{
          user_role: userRole || 'System',
          action,
          details
        }]);
      } catch (e) {
        console.error("Failed to insert live audit log", e);
      }
      return;
    }
    return mockDb.addLog(userRole, action, details);
  }

  async syncOrderToGoogleSheet(order) {
    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (!url || url === 'YOUR_APPSCRIPT_URL' || url === '') {
      console.log("Google Sheets sync skipped: VITE_APPSCRIPT_URL is not set.");
      return;
    }
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "CREATE_ORDER",
          order_no: order.order_no,
          firm_name: order.firm_name,
          party_name: order.party_name,
          product_name: order.product_name,
          qty: order.qty,
          rate: order.rate,
          transport_type: order.transport_type,
          dispatch_date: order.dispatch_date,
          po_copy_url: order.po_copy_url,
          po_file_base64: order.po_file_base64,
          po_file_name: order.po_file_name,
          po_file_type: order.po_file_type
        })
      });
      console.log("Successfully sent order data to Google Sheet Apps Script.");
    } catch (error) {
      console.error("Error syncing order to Google Sheet:", error);
    }
  }

  async syncLogisticsToGoogleSheet(logistics) {
    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (!url || url === 'YOUR_APPSCRIPT_URL' || url === '') {
      console.log("Google Sheets sync skipped: VITE_APPSCRIPT_URL is not set.");
      return;
    }
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "UPDATE_LOGISTICS",
          order_no: logistics.order_no,
          transporter_name: logistics.transporter_name,
          truck_no: logistics.truck_no,
          bilty_no: logistics.bilty_no,
          actual_truck_qty: logistics.actual_truck_qty,
          bilty_copy_url: logistics.bilty_copy_url || "",
          bilty_file_base64: logistics.bilty_file_base64 || "",
          bilty_file_name: logistics.bilty_file_name || "",
          bilty_file_type: logistics.bilty_file_type || "",
          rate_type: logistics.rate_type,
          rate_value: logistics.rate_value
        })
      });
      console.log("Successfully sent logistics update to Google Sheet.");
    } catch (error) {
      console.error("Error syncing logistics to Google Sheet:", error);
    }
  }

  async syncInvoiceToGoogleSheet(invoice) {
    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (!url || url === 'YOUR_APPSCRIPT_URL' || url === '') {
      console.log("Google Sheets sync skipped: VITE_APPSCRIPT_URL is not set.");
      return;
    }
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "UPDATE_INVOICE",
          order_no: invoice.order_no,
          invoice_no: invoice.invoice_no,
          invoice_copy_url: invoice.invoice_copy_url || "",
          invoice_file_base64: invoice.invoice_file_base64 || "",
          invoice_file_name: invoice.invoice_file_name || "",
          invoice_file_type: invoice.invoice_file_type || ""
        })
      });
      console.log("Successfully sent invoice update to Google Sheet.");
    } catch (error) {
      console.error("Error syncing invoice to Google Sheet:", error);
    }
  }

  // --- Users Management ---
  async getUsers() {
    await this.delay();

    // 1. Google Sheets fetch check
    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (url && url !== 'YOUR_APPSCRIPT_URL' && url !== '') {
      try {
        console.log("Database Service: Fetching live users from Google Sheet Login tab...");
        const response = await fetch(`${url}?sheetName=Login`);
        const result = await response.json();
        if (result && result.status === 'success' && Array.isArray(result.data)) {
          return result.data
            .filter(u => u["User Name"] && u["User Name"].toString().trim() !== "")
            .map(u => ({
              user_name: u["User Name"].toString().trim(),
              password: u["Password"] ? u["Password"].toString().trim() : "",
              role: u["Role"] ? u["Role"].toString().trim() : "Sales",
              firm_name: u["Firm Name"] ? u["Firm Name"].toString().trim() : ""
            }));
        }
      } catch (e) {
        console.error("Database Service: Failed to fetch users from Google Sheet", e);
      }
    }

    // 2. Supabase select check
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase.from('users').select('*');
        if (!error && data) return data;
      } catch (e) {
        console.error("Supabase user fetch failed, using mock:", e);
      }
    }

    // 3. Fallback to mockDb
    return mockDb.getUsers();
  }

  async saveUser(user) {
    await this.delay();

    // 1. Supabase update check
    if (this.useSupabase) {
      try {
        await this.supabase.from('users').upsert([{
          user_name: user.user_name,
          password: user.password,
          role: user.role,
          firm_name: user.firm_name || ""
        }], { onConflict: 'user_name' });
      } catch (e) {
        console.error("Supabase user save failed:", e);
      }
    }

    // 2. Google Sheet update check
    await this.syncUserToGoogleSheet(user, "SAVE_USER");

    // 3. Save to local mockDb
    return mockDb.saveUser(user);
  }

  async deleteUser(userName) {
    await this.delay();

    // 1. Supabase delete check
    if (this.useSupabase) {
      try {
        await this.supabase.from('users').delete().eq('user_name', userName);
      } catch (e) {
        console.error("Supabase user delete failed:", e);
      }
    }

    // 2. Google Sheet delete check
    await this.syncUserToGoogleSheet({ user_name: userName }, "DELETE_USER");

    // 3. Delete in mockDb
    return mockDb.deleteUser(userName);
  }

  async syncUserToGoogleSheet(user, action) {
    const url = import.meta.env.VITE_APPSCRIPT_URL;
    if (!url || url === 'YOUR_APPSCRIPT_URL' || url === '') {
      return;
    }
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          user_name: user.user_name,
          password: user.password || "",
          role: user.role || "",
          firm_name: user.firm_name || ""
        })
      });
      console.log(`Successfully synced ${action} to Google Sheet.`);
    } catch (error) {
      console.error("Error syncing user action to Google Sheet:", error);
    }
  }

  async reset() {
    await this.delay();
    if (this.useSupabase) {
      throw new Error("Reset not supported on Live Database for security. Please run clean scripts on your SQL Console.");
    }
    return mockDb.reset();
  }
}

export const db = new DatabaseService();
export default db;
