// Mock Database Layer powered by LocalStorage
// Implements transactional rules like stock deduction and serial order number generation

const SEED_PRODUCTS = [];

const SEED_PARTIES = [];

const SEED_ORDERS = [];

const SEED_LOGISTICS = [];

const SEED_INVOICES = [];

const SEED_INVENTORY = [];

const SEED_LOGS = [];

const SEED_USERS = [
  { user_name: 'admin', password: '123', role: 'Admin', firm_name: 'Pmmpl' },
  { user_name: 'sales', password: '123', role: 'Sales', firm_name: 'RKL' },
  { user_name: 'logistics', password: '123', role: 'Logistics', firm_name: '' },
  { user_name: 'accounts', password: '123', role: 'Accounts', firm_name: '' }
];

// Helper to access LocalStorage collections
const getCollection = (key, defaultData) => {
  const data = localStorage.getItem(`fms_${key}`);
  if (!data) {
    localStorage.setItem(`fms_${key}`, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
};

const saveCollection = (key, data) => {
  localStorage.setItem(`fms_${key}`, JSON.stringify(data));
};

export const mockDb = {
  // --- Initialization ---
  init() {
    getCollection('products', SEED_PRODUCTS);
    getCollection('parties', SEED_PARTIES);
    getCollection('orders', SEED_ORDERS);
    getCollection('logistics', SEED_LOGISTICS);
    getCollection('invoices', SEED_INVOICES);
    getCollection('inventory', SEED_INVENTORY);
    getCollection('activity_logs', SEED_LOGS);
    getCollection('users', SEED_USERS);
  },

  reset() {
    localStorage.removeItem('fms_products');
    localStorage.removeItem('fms_parties');
    localStorage.removeItem('fms_orders');
    localStorage.removeItem('fms_logistics');
    localStorage.removeItem('fms_invoices');
    localStorage.removeItem('fms_inventory');
    localStorage.removeItem('fms_activity_logs');
    localStorage.removeItem('fms_users');
    this.init();
    this.addLog('Admin', 'Database Factory Reset Triggered', {});
  },

  // --- Users Management ---
  getUsers() {
    return getCollection('users', SEED_USERS);
  },

  saveUser(userData) {
    const users = getCollection('users', SEED_USERS);
    const index = users.findIndex(u => u.user_name.toLowerCase() === userData.user_name.toLowerCase());
    
    const newUserObj = {
      user_name: userData.user_name,
      password: userData.password,
      role: userData.role,
      firm_name: userData.firm_name || ""
    };

    if (index !== -1) {
      users[index] = newUserObj;
    } else {
      users.push(newUserObj);
    }
    
    saveCollection('users', users);
    this.addLog('Admin', `User Saved: ${userData.user_name}`, { role: userData.role, firm_name: userData.firm_name });
    return newUserObj;
  },

  deleteUser(userName) {
    const users = getCollection('users', SEED_USERS);
    const filtered = users.filter(u => u.user_name.toLowerCase() !== userName.toLowerCase());
    saveCollection('users', filtered);
    this.addLog('Admin', `User Deleted: ${userName}`, {});
  },

  // --- Activity Logs ---
  getLogs() {
    return getCollection('activity_logs', SEED_LOGS).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addLog(userRole, action, details = {}) {
    const logs = getCollection('activity_logs', SEED_LOGS);
    const newLog = {
      id: `lg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_role: userRole || 'System',
      action,
      details,
      created_at: new Date().toISOString()
    };
    logs.push(newLog);
    saveCollection('activity_logs', logs);
    return newLog;
  },

  // --- Parties ---
  getParties() {
    return getCollection('parties', SEED_PARTIES);
  },

  createParty(name) {
    const parties = getCollection('parties', SEED_PARTIES);
    if (parties.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Party "${name}" already exists.`);
    }
    const newParty = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name
    };
    parties.push(newParty);
    saveCollection('parties', parties);
    this.addLog('Admin', `Party Created: ${name}`, { id: newParty.id });
    return newParty;
  },

  deleteParty(id) {
    const parties = getCollection('parties', SEED_PARTIES);
    const orders = getCollection('orders', SEED_ORDERS);
    if (orders.some(o => o.party_id === id)) {
      throw new Error("Cannot delete party because it is linked to active sale orders.");
    }
    const filtered = parties.filter(p => p.id !== id);
    saveCollection('parties', filtered);
    this.addLog('Admin', `Party Deleted`, { party_id: id });
  },

  // --- Products ---
  getProducts() {
    return getCollection('products', SEED_PRODUCTS);
  },

  createProduct(name, availableQty, unit) {
    const products = getCollection('products', SEED_PRODUCTS);
    if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Product "${name}" already exists.`);
    }
    const newProduct = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      available_qty: parseFloat(availableQty) || 0,
      unit: unit || 'MT'
    };
    products.push(newProduct);
    saveCollection('products', products);

    // Sync Inventory Entry
    const inventory = getCollection('inventory', SEED_INVENTORY);
    inventory.push({
      product_id: newProduct.id,
      available_qty: newProduct.available_qty,
      sold_qty: 0.0
    });
    saveCollection('inventory', inventory);

    this.addLog('Admin', `Product Created: ${name}`, { id: newProduct.id, available_qty: availableQty });
    return newProduct;
  },

  updateProduct(id, name, availableQty, unit) {
    const products = getCollection('products', SEED_PRODUCTS);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Product not found.");
    
    const oldProduct = products[index];
    products[index] = {
      ...oldProduct,
      name,
      available_qty: parseFloat(availableQty) || 0,
      unit
    };
    saveCollection('products', products);

    // Sync Inventory Entry
    const inventory = getCollection('inventory', SEED_INVENTORY);
    const invIndex = inventory.findIndex(i => i.product_id === id);
    if (invIndex !== -1) {
      inventory[invIndex].available_qty = parseFloat(availableQty) || 0;
    } else {
      inventory.push({
        product_id: id,
        available_qty: parseFloat(availableQty) || 0,
        sold_qty: 0.0
      });
    }
    saveCollection('inventory', inventory);

    this.addLog('Admin', `Product Updated: ${name}`, { id, old_qty: oldProduct.available_qty, new_qty: availableQty });
    return products[index];
  },

  deleteProduct(id) {
    const products = getCollection('products', SEED_PRODUCTS);
    const orders = getCollection('orders', SEED_ORDERS);
    if (orders.some(o => o.product_id === id)) {
      throw new Error("Cannot delete product because it is linked to active sale orders.");
    }
    const filteredProducts = products.filter(p => p.id !== id);
    saveCollection('products', filteredProducts);

    // Filter out inventory
    const inventory = getCollection('inventory', SEED_INVENTORY);
    const filteredInventory = inventory.filter(i => i.product_id !== id);
    saveCollection('inventory', filteredInventory);

    this.addLog('Admin', `Product Deleted`, { product_id: id });
  },

  // --- Orders ---
  getOrders() {
    const orders = getCollection('orders', SEED_ORDERS);
    const logs = getCollection('logistics', SEED_LOGISTICS);
    const invs = getCollection('invoices', SEED_INVOICES);

    return orders.map(o => {
      const hasLogistics = logs.some(l => l.order_id === o.id);
      const hasInvoice = invs.some(i => i.order_id === o.id);
      const isApproved = hasLogistics || hasInvoice || localStorage.getItem('fms_approved_' + o.order_no) === 'true';

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
        ...o,
        status
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  createOrder(orderData, userRole, customOrderNo) {
    const orders = getCollection('orders', SEED_ORDERS);
    const products = getCollection('products', SEED_PRODUCTS);
    const parties = getCollection('parties', SEED_PARTIES);

    // Generate serial number RM-xxxx
    const currentYear = new Date().getFullYear();
    const count = orders.length + 1;
    const orderNo = customOrderNo || `RM-${String(count).padStart(4, '0')}`;

    // Defensive cleanup of any old leftover local storage states for this order number
    localStorage.removeItem('fms_approved_' + orderNo);
    const localLogs = JSON.parse(localStorage.getItem('fms_logistics') || '[]');
    const filteredLogs = localLogs.filter(l => l.order_no !== orderNo);
    localStorage.setItem('fms_logistics', JSON.stringify(filteredLogs));
    
    const localInvoices = JSON.parse(localStorage.getItem('fms_invoices') || '[]');
    const filteredInvoices = localInvoices.filter(i => i.order_no !== orderNo);
    localStorage.setItem('fms_invoices', JSON.stringify(filteredInvoices));

    // Get party name and product details
    const party = parties.find(p => p.id === orderData.party_id) || { id: orderData.party_id, name: orderData.party_id };
    const product = products.find(p => p.id === orderData.product_id) || { id: orderData.product_id, name: orderData.product_id, available_qty: 999999, unit: 'MT' };

    const qty = parseFloat(orderData.qty);
    const rate = parseFloat(orderData.rate);
    const amount = qty * rate;

    // Check inventory stock quantity for WARNING (note: doesn't block create, but returns warning flag)
    let isStockWarning = false;
    if (product.available_qty < qty) {
      isStockWarning = true;
    }

    const newOrder = {
      id: `o_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      order_no: orderNo,
      firm_name: orderData.firm_name || '',
      party_id: orderData.party_id,
      party_name: party.name,
      product_id: orderData.product_id,
      product_name: product.name,
      qty,
      rate,
      amount,
      transport_type: orderData.transport_type,
      dispatch_date: orderData.dispatch_date,
      po_copy_url: orderData.po_copy_url || '',
      status: 'Pending Logistics',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stock_warned: isStockWarning
    };

    orders.push(newOrder);
    saveCollection('orders', orders);
    this.addLog(userRole || 'Sales', `Sale Order ${orderNo} Created`, { 
      order_no: orderNo, 
      party: party.name, 
      product: product.name, 
      qty, 
      amount, 
      stock_warned: isStockWarning 
    });

    return { order: newOrder, warned: isStockWarning };
  },

  // --- Logistics ---
  getLogistics() {
    return getCollection('logistics', SEED_LOGISTICS);
  },

  saveLogistics(logisticsData, userRole) {
    const logistics = getCollection('logistics', SEED_LOGISTICS);
    const orders = getCollection('orders', SEED_ORDERS);
    
    const orderIndex = orders.findIndex(o => o.id === logisticsData.order_id);
    
    let order;
    if (orderIndex === -1) {
      order = {
        id: logisticsData.order_id,
        order_no: logisticsData.order_no || (logisticsData.order_id.startsWith('order_') ? logisticsData.order_id.replace('order_', '') : 'RM-UNKNOWN'),
        status: 'Pending Logistics'
      };
    } else {
      order = orders[orderIndex];
      if (order.status !== 'Pending Logistics') {
        throw new Error(`Order ${order.order_no} is already processed past logistics.`);
      }
    }

    const actualTruckQty = parseFloat(logisticsData.actual_truck_qty);
    const rateValue = parseFloat(logisticsData.rate_value);
    
    // Freight calculation logic
    let freightAmount = 0;
    if (logisticsData.rate_type === 'Fixed') {
      freightAmount = rateValue;
    } else {
      freightAmount = actualTruckQty * rateValue;
    }

    const newLogistics = {
      id: `l_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      order_id: logisticsData.order_id,
      order_no: order.order_no,
      transporter_name: logisticsData.transporter_name,
      truck_no: logisticsData.truck_no,
      bilty_no: logisticsData.bilty_no,
      actual_truck_qty: actualTruckQty,
      bilty_copy_url: logisticsData.bilty_copy_url || '',
      rate_type: logisticsData.rate_type,
      rate_value: rateValue,
      freight_amount: freightAmount,
      description: logisticsData.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    logistics.push(newLogistics);
    saveCollection('logistics', logistics);

    // Update Order Status to Pending Invoice and set transport_type if changed in local storage orders
    if (orderIndex !== -1) {
      orders[orderIndex].status = 'Pending Invoice';
      if (logisticsData.transport_type) {
        orders[orderIndex].transport_type = logisticsData.transport_type;
      }
      orders[orderIndex].updated_at = new Date().toISOString();
      saveCollection('orders', orders);
    }

    this.addLog(userRole || 'Logistics', `Logistics Added for Order ${order.order_no}`, {
      order_no: order.order_no,
      transporter: logisticsData.transporter_name,
      bilty: logisticsData.bilty_no,
      freight: freightAmount,
      description: logisticsData.description || '',
      transport_type: logisticsData.transport_type || order.transport_type
    });

    return newLogistics;
  },

  // --- Invoices ---
  getInvoices() {
    return getCollection('invoices', SEED_INVOICES);
  },

  saveInvoice(invoiceData, userRole) {
    const invoices = getCollection('invoices', SEED_INVOICES);
    const orders = getCollection('orders', SEED_ORDERS);
    const products = getCollection('products', SEED_PRODUCTS);
    const inventory = getCollection('inventory', SEED_INVENTORY);

    const orderIndex = orders.findIndex(o => o.id === invoiceData.order_id);
    
    let order;
    if (orderIndex === -1) {
      order = {
        id: invoiceData.order_id,
        order_no: invoiceData.order_no || (invoiceData.order_id.startsWith('order_') ? invoiceData.order_id.replace('order_', '') : 'RM-UNKNOWN'),
        status: 'Pending Invoice',
        qty: parseFloat(invoiceData.qty) || 0,
        product_id: invoiceData.product_id || '',
        product_name: invoiceData.product_name || 'Product'
      };
    } else {
      order = orders[orderIndex];
      if (order.status !== 'Pending Invoice') {
        throw new Error(`Order ${order.order_no} is not pending invoice.`);
      }
    }

    // Check duplicate invoice number
    if (invoices.some(i => i.invoice_no === invoiceData.invoice_no)) {
      throw new Error(`Invoice No "${invoiceData.invoice_no}" already exists.`);
    }

    const newInvoice = {
      id: `i_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      order_id: invoiceData.order_id,
      order_no: order.order_no,
      invoice_no: invoiceData.invoice_no,
      invoice_copy_url: invoiceData.invoice_copy_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    invoices.push(newInvoice);
    saveCollection('invoices', invoices);

    // Update Order Status to Completed
    if (orderIndex !== -1) {
      orders[orderIndex].status = 'Completed';
      orders[orderIndex].updated_at = new Date().toISOString();
      saveCollection('orders', orders);
    }

    // Auto Deduct Stock Transactional triggers
    const prodId = order.product_id;
    const qty = order.qty;

    if (prodId) {
      // Deduct from products list
      const prodIndex = products.findIndex(p => p.id === prodId);
      if (prodIndex !== -1) {
        const oldQty = products[prodIndex].available_qty;
        products[prodIndex].available_qty = Math.max(0, oldQty - qty);
        saveCollection('products', products);
      }

      // Add to inventory sold count
      const invIndex = inventory.findIndex(inv => inv.product_id === prodId);
      if (invIndex !== -1) {
        inventory[invIndex].sold_qty = (inventory[invIndex].sold_qty || 0) + qty;
        // sync product available quantity with inventory
        const prod = products.find(p => p.id === prodId);
        if (prod) {
          inventory[invIndex].available_qty = prod.available_qty + inventory[invIndex].sold_qty;
        }
        saveCollection('inventory', inventory);
      }
    }

    this.addLog(userRole || 'Accounts', `Invoice Created: ${invoiceData.invoice_no}`, {
      order_no: order.order_no,
      invoice_no: invoiceData.invoice_no,
      deducted_qty: qty
    });

    this.addLog('System', `Inventory Stock Deducted for Product: ${order.product_name || 'Product'}`, {
      product: order.product_name || 'Product',
      deducted: qty
    });

    return newInvoice;
  },

  // --- Combined Inventory State ---
  getInventory() {
    const products = this.getProducts();
    const inventory = getCollection('inventory', SEED_INVENTORY);
    const orders = this.getOrders();

    // Recompute to make sure it's 100% accurate
    return products.map(p => {
      const inv = inventory.find(i => i.product_id === p.id);
      
      // Calculate Sold Qty based on actual COMPLETED orders
      const completedOrders = orders.filter(o => o.product_id === p.id && o.status === 'Completed');
      const soldQty = completedOrders.reduce((sum, o) => sum + o.qty, 0);

      // Remaining Qty = Current Available Stock (which was already deducted upon invoice completion)
      // Wait, let's keep the formula: Remaining Qty = Total Available (initial) - Sold Qty
      // In the database trigger: available_qty represents remaining stock.
      // In the UI columns:
      // - Product Name
      // - Available Qty (Initial quantity, meaning current available + sold)
      // - Sold Qty (Total sold)
      // - Remaining Qty (Available stock left, i.e., Initial - Sold)
      const remainingQty = p.available_qty;
      const initialQty = remainingQty + soldQty;

      return {
        product_id: p.id,
        product_name: p.name,
        available_qty: initialQty, // "Initial available stock" before sales
        sold_qty: soldQty,
        remaining_qty: remainingQty, // current available
        unit: p.unit
      };
    });
  }
};
