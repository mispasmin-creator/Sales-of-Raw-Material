import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility to merge Tailwind CSS classes dynamically
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const parseMultiValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => item.toString().trim()).filter(Boolean);
  }

  return (value || '')
    .toString()
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

export const hasPageAccess = (value, requiredAccess) => {
  const selectedAccess = parseMultiValue(value);
  return selectedAccess.includes('Admin') || selectedAccess.includes(requiredAccess);
};

export const filterByFirmAccess = (records, currentUser) => {
  if (hasPageAccess(currentUser?.role, 'Admin')) return records;

  const assignedFirms = parseMultiValue(currentUser?.firm_name)
    .map(firm => firm.toLowerCase());

  if (assignedFirms.length === 0) return records;

  return records.filter(record =>
    assignedFirms.includes((record?.firm_name || '').toString().trim().toLowerCase())
  );
};

export const canAccessTab = (tab, userRole) => {
  const tabAccess = {
    dashboard: ['Admin', 'Sales', 'Logistics', 'Accounts'],
    sales: ['Admin', 'Sales'],
    logistics: ['Admin', 'Logistics'],
    invoices: ['Admin', 'Accounts'],
    settings: ['Admin']
  };

  return (tabAccess[tab] || tabAccess.dashboard)
    .some(access => hasPageAccess(userRole, access));
};

const TAB_ROUTES = {
  dashboard: '/dashboard',
  sales: '/sale-orders',
  logistics: '/logistics',
  invoices: '/invoices',
  settings: '/user-management'
};

export const getPathForTab = (tab) => TAB_ROUTES[tab] || TAB_ROUTES.dashboard;

export const getTabFromPath = (pathName) => {
  const normalizedPath = (pathName || '/')
    .replace(/\/+$/, '')
    .toLowerCase() || '/';

  return Object.entries(TAB_ROUTES)
    .find(([, path]) => path === normalizedPath)?.[0] || null;
};

// Format currency as Indian Rupees (INR) or general dollars
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Format numbers with commas and decimals
export function formatNumber(num, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

// Export array of objects to Excel (CSV compatible structure)
export function exportToCSV(data, headers, filename = 'report') {
  if (!data || !data.length) return;

  const headerKeys = Object.keys(headers);
  const csvRows = [];

  // Add Headers
  csvRows.push(headerKeys.map(key => `"${headers[key]}"`).join(','));

  // Add Rows
  for (const row of data) {
    const values = headerKeys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      // Escape double quotes
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Client-side PDF print utility
export function printDocument(elementId, title = 'Document') {
  const printContent = document.getElementById(elementId);
  if (!printContent) return;

  const originalTitle = document.title;
  document.title = `${title}_${new Date().toISOString().split('T')[0]}`;

  // Use simple and highly reliable window.print with custom stylesheet trigger
  window.print();

  // Restore original title
  document.title = originalTitle;
}
