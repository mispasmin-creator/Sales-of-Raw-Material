import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  CircleDollarSign, 
  Warehouse, 
  TrendingUp, 
  Boxes,
  Truck,
  ArrowRight,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { formatCurrency, formatNumber } from '../../lib/utils';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { useApp } from '../../context/AppContext';

export const Dashboard = () => {
  const { setActiveTab } = useApp();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingLogistics: 0,
    pendingInvoice: 0,
    completedOrders: 0,
    totalSales: 0,
    totalStock: 0
  });

  const [chartData, setChartData] = useState({
    monthlySales: [],
    productSales: [],
    logisticsPerf: []
  });

  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [orders, inventory, logs] = await Promise.all([
        db.getOrders(),
        db.getInventory(),
        db.getLogs()
      ]);

      // 1. Calculate KPI Metrics
      const totalOrders = orders.length;
      const pendingLogistics = orders.filter(o => o.status === 'Pending Logistics').length;
      const pendingInvoice = orders.filter(o => o.status === 'Pending Invoice').length;
      const completedOrders = orders.filter(o => o.status === 'Completed').length;
      
      const totalSales = orders
        .filter(o => o.status === 'Completed')
        .reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
      
      const totalStock = inventory.reduce((sum, item) => sum + (parseFloat(item.remaining_qty) || 0), 0);

      setMetrics({
        totalOrders,
        pendingLogistics,
        pendingInvoice,
        completedOrders,
        totalSales,
        totalStock
      });

      // 2. Prepare Monthly Sales Chart Data (Simulated Trend + Completed)
      // Group completed orders by month (or generic layout)
      const monthlySales = [
        { month: 'Jan', sales: 4200000 },
        { month: 'Feb', sales: 5800000 },
        { month: 'Mar', sales: 8100000 },
        { month: 'Apr', sales: 6500000 },
        { month: 'May', sales: 9800000 },
        { month: 'Jun', sales: totalSales > 0 ? totalSales : 11250000 }
      ];

      // 3. Prepare Product Sales Chart Data
      const prodMap = {};
      orders.forEach(o => {
        if (o.status === 'Completed') {
          prodMap[o.product_name] = (prodMap[o.product_name] || 0) + (parseFloat(o.amount) || 0);
        }
      });

      const productSales = Object.keys(prodMap).map(key => ({
        name: key.split(' ')[0], // short name
        value: prodMap[key]
      }));

      // Fallback if no completed orders
      const defaultProductSales = [
        { name: 'Steel', value: 11250000 },
        { name: 'Coal', value: 3400000 },
        { name: 'Limestone', value: 1200000 }
      ];

      // 4. Logistics Performance (Tonnage loaded)
      const logisticsList = await db.getLogistics();
      const logisticsPerf = logisticsList.map(l => ({
        truck: l.truck_no.split('-').pop(), // last block
        tonnage: l.actual_truck_qty,
        carrier: l.transporter_name.split(' ')[0]
      }));

      setChartData({
        monthlySales,
        productSales: productSales.length > 0 ? productSales : defaultProductSales,
        logisticsPerf: logisticsPerf.length > 0 ? logisticsPerf.slice(0, 5) : [
          { truck: '9876', tonnage: 250, carrier: 'FastTrack' },
          { truck: '1234', tonnage: 800, carrier: 'SafeMove' }
        ]
      });

      // 5. Recent activities
      setActivities(logs.slice(0, 4));

    } catch (e) {
      console.error("Failed to compile dashboard analytics", e);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#657edb', '#3b4ab9', '#90a6e5', '#343f98', '#1b1f49'];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-navy-500">Compiling Analytics...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: 'Total Orders', value: metrics.totalOrders, icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/30 dark:text-blue-400', tab: 'sales' },
    { title: 'Pending Logistics', value: metrics.pendingLogistics, icon: Truck, color: 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/30 dark:text-orange-400', tab: 'logistics' },
    { title: 'Pending Invoice', value: metrics.pendingInvoice, icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/30 dark:text-amber-400', tab: 'invoices' },
    { title: 'Completed Sales', value: metrics.completedOrders, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400', tab: 'sales' },
    { title: 'Total Sales Revenue', value: formatCurrency(metrics.totalSales), icon: CircleDollarSign, color: 'text-violet-600 bg-violet-50 border-violet-100 dark:bg-violet-950/30 dark:border-violet-900/30 dark:text-violet-400', tab: 'sales' },
    { title: 'Available Inventory', value: `${formatNumber(metrics.totalStock, 0)} MT`, icon: Warehouse, color: 'text-slate-navy-600 bg-slate-navy-50 border-slate-navy-100 dark:bg-slate-navy-950/30 dark:border-slate-navy-800/30 dark:text-slate-navy-400', tab: 'dashboard' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Title Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white">
            Operations & Analytics Control
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Real-time tracking of raw material dispatches, logistics, and billing pipelines.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadDashboardData}
          className="self-start md:self-auto gap-2"
        >
          <Activity className="h-4 w-4 text-brand-600 animate-pulse" />
          Refresh Stats
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx}
              onClick={() => setActiveTab(kpi.tab)}
              className="glass-card flex items-center justify-between p-5 rounded-xl border border-slate-100/50 cursor-pointer hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-navy-400 uppercase tracking-wide">
                  {kpi.title}
                </p>
                <h3 className="text-2xl font-extrabold font-heading text-slate-navy-900 dark:text-white">
                  {kpi.value}
                </h3>
              </div>
              <div className={`rounded-xl p-3 border shadow-xs transition-transform group-hover:scale-105 ${kpi.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Monthly sales Trend (Area) */}
        <div className="glass-card rounded-xl p-5 border border-slate-100/50 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-navy-800">
            <h4 className="text-sm font-bold font-heading text-slate-navy-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              Commercial Revenue Sales Trend (H1)
            </h4>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase">
              INR (₹) Monthly
            </span>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData.monthlySales}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#657edb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#657edb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/100000}L`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#657edb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productwise sales (Pie) */}
        <div className="glass-card rounded-xl p-5 border border-slate-100/50 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-navy-800">
            <h4 className="text-sm font-bold font-heading text-slate-navy-800 dark:text-slate-200 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-brand-600" />
              Product Wise Sales
            </h4>
            <span className="text-[10px] text-slate-navy-400">Share Ratio</span>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={chartData.productSales}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.productSales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Sales']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Pie Legends */}
          <div className="flex flex-wrap justify-center gap-3 text-[11px] font-semibold text-slate-navy-500">
            {chartData.productSales.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {entry.name}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Logistics & Recent Activities splits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Logistics Tonnage Perf */}
        <div className="glass-card rounded-xl p-5 border border-slate-100/50 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-navy-800">
            <h4 className="text-sm font-bold font-heading text-slate-navy-800 dark:text-slate-200 flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-600" />
              Tonnage Dispatch Volume (Recent Fleet)
            </h4>
            <span className="text-[10px] text-slate-navy-400">Metric Tons (MT)</span>
          </div>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData.logisticsPerf}>
                <XAxis dataKey="truck" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `TR-${v}`} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  formatter={(value, name, props) => [`${value} MT (${props.payload.carrier})`, 'Weight']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="tonnage" fill="#657edb" radius={[4, 4, 0, 0]} barSize={35}>
                  {chartData.logisticsPerf.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audit timeline */}
        <div className="glass-card rounded-xl p-5 border border-slate-100/50 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-navy-800">
            <h4 className="text-sm font-bold font-heading text-slate-navy-800 dark:text-slate-200 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              Recent FMS Activity Logs
            </h4>
            <Button variant="link" size="sm" onClick={() => setActiveTab('sales')} className="text-xs">
              View All
            </Button>
          </div>
          
          <div className="relative pl-4 space-y-5 border-l-2 border-slate-100 dark:border-slate-navy-800">
            {activities.map((act) => (
              <div key={act.id} className="relative space-y-1">
                {/* Bullet node */}
                <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-navy-950" />
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {act.user_role}
                  </span>
                  <span className="text-[10px] text-slate-navy-400 font-medium">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-navy-700 dark:text-slate-navy-300">
                  {act.action}
                </h5>
                {act.details && (
                  <p className="text-[10px] text-slate-navy-500 leading-normal truncate">
                    {Object.keys(act.details).map(k => `${k}: ${act.details[k]}`).join(' | ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Dashboard;
