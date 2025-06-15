import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import { Package, Users, ShoppingBag, DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import LoadingSpinner from "../../components/UI/LoadingSpinner";

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-blue-100 p-3 rounded-full">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center ${parseFloat(trend) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp className={`w-4 h-4 mr-1 ${parseFloat(trend) < 0 ? 'transform rotate-180' : ''}`} />
          <span className="text-sm">{parseFloat(trend) >= 0 ? '+' : ''}{trend}%</span>
        </div>
      )}
    </div>
    <h3 className="text-gray-600 text-sm mb-1">{title}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const RecentOrder = ({ order }) => {
  // Ensure order has all required properties with defaults
  const safeOrder = {
    _id: order._id || 'unknown',
    orderNumber: order.orderNumber || `Order #${(order._id || 'unknown').toString().slice(-8)}`,
    createdAt: order.createdAt || new Date(),
    items: order.items || [],
    user: order.user || { name: 'Unknown customer' },
    totalAmount: order.totalAmount || 0,
    status: order.status || 'unknown'
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium">
          {safeOrder.orderNumber}
        </p>
        <p className="text-sm text-gray-600">
          {new Date(safeOrder.createdAt).toLocaleDateString()} • {safeOrder.items.length} items
        </p>
        <p className="text-xs text-gray-500">{safeOrder.user.name}</p>
      </div>
      <div className="text-right">
        <p className="font-bold">${safeOrder.totalAmount.toFixed(2)}</p>
        <p className={`text-sm capitalize ${getStatusColor(safeOrder.status)}`}>{safeOrder.status}</p>
      </div>
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'delivered':
      return 'text-green-600';
    case 'shipped':
      return 'text-blue-600';
    case 'processing':
      return 'text-orange-500';
    case 'cancelled':
      return 'text-red-600';
    case 'refunded':
      return 'text-purple-600';
    case 'pending':
    default:
      return 'text-gray-600';
  }
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log("Fetching admin dashboard data...");
        
        // Create a default stats object in case the API call fails
        let dashboardStats = {
          totalOrders: 0,
          totalCustomers: 0,
          totalProducts: 0,
          totalRevenue: 0,
          orderGrowth: 0,
          customerGrowth: 0,
          revenueGrowth: 0,
          pendingTasks: []
        };
        
        // Try to fetch stats first
        try {
          const statsResponse = await axios.get("/api/admin/stats");
          console.log("Stats response:", statsResponse.data);
          dashboardStats = statsResponse.data;
        } catch (statsError) {
          console.error("Error fetching stats:", statsError);
          console.error("Stats error response:", statsError.response?.data);
          console.error("Stats error status:", statsError.response?.status);
          // Continue with default stats instead of throwing
        }
        
        // Set stats regardless of whether the API call succeeded
        setStats(dashboardStats);
        
        // Then try to fetch recent orders
        try {
          const ordersResponse = await axios.get("/api/admin/orders/recent");
          console.log("Orders response:", ordersResponse.data);
          setRecentOrders(ordersResponse.data.orders || []);
        } catch (ordersError) {
          console.error("Error fetching recent orders:", ordersError);
          console.error("Orders error response:", ordersError.response?.data);
          console.error("Orders error status:", ordersError.response?.status);
          // Set empty orders array instead of throwing
          setRecentOrders([]);
        }
        
        // Clear any previous errors
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        console.error("Error response:", err.response?.data);
        console.error("Error status:", err.response?.status);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Ensure stats is not null
  const safeStats = stats || {
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    orderGrowth: 0,
    customerGrowth: 0,
    revenueGrowth: 0,
    pendingTasks: []
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="space-x-4">
          <Link
            to="/admin/products"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Manage Products
          </Link>
          <Link
            to="/admin/products/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Product
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Orders"
          value={safeStats.totalOrders || 0}
          icon={Package}
          trend={safeStats.orderGrowth}
        />
        <StatCard
          title="Total Customers"
          value={safeStats.totalCustomers || 0}
          icon={Users}
          trend={safeStats.customerGrowth}
        />
        <StatCard
          title="Total Products"
          value={safeStats.totalProducts || 0}
          icon={ShoppingBag}
        />
        <StatCard
          title="Total Revenue"
          value={`$${(safeStats.totalRevenue || 0).toFixed(2)}`}
          icon={DollarSign}
          trend={safeStats.revenueGrowth}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-blue-600 hover:text-blue-800">
              View All
            </Link>
          </div>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <RecentOrder key={order._id || Math.random().toString()} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No orders found</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Pending Tasks</h2>
          </div>
          {safeStats.pendingTasks && safeStats.pendingTasks.length > 0 ? (
            <div className="space-y-4">
              {safeStats.pendingTasks.map((task, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <Clock className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span>{task}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No pending tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
