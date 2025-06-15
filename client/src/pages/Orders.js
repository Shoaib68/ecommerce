import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import { Package, Truck, Check, Clock } from "lucide-react";

const OrderStatusIcon = ({ status }) => {
  switch (status.toLowerCase()) {
    case "pending":
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case "processing":
      return <Package className="w-5 h-5 text-blue-500" />;
    case "shipped":
      return <Truck className="w-5 h-5 text-purple-500" />;
    case "delivered":
      return <Check className="w-5 h-5 text-green-500" />;
    default:
      return null;
  }
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get("/orders");
        setOrders(data.orders || data);
        setError(null);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">No Orders Yet</h2>
        <p className="text-gray-600 mb-8">Start shopping to create your first order!</p>
        <Link
          to="/products"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Order #{order._id.slice(-8)}</h3>
                  <p className="text-sm text-gray-600">
                    Placed on {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <OrderStatusIcon status={order.status} />
                  <span className="font-medium capitalize">{order.status}</span>
                </div>
              </div>

              <div className="border-t border-b py-4 mb-4">
                {order.items.map((item) => (
                  <div key={item._id} className="flex items-center py-2">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={
                          item.product?.images && item.product.images.length > 0
                            ? (typeof item.product.images[0] === 'object' 
                              ? item.product.images[0].url 
                              : item.product.images[0])
                            : "/placeholder-product.jpg"
                        }
                        alt={item.product?.name || item.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <div className="ml-4 flex-grow">
                      {item.product ? (
                        <Link
                          to={`/products/${item.product._id}`}
                          className="font-medium hover:text-blue-600 transition-colors"
                        >
                          {item.product.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Shipping Address:</p>
                  <p className="text-sm">
                    {order.shippingAddress?.street || 'N/A'}, {order.shippingAddress?.city || 'N/A'},{" "}
                    {order.shippingAddress?.state || 'N/A'} {order.shippingAddress?.zipCode || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Amount:</p>
                  <p className="text-xl font-bold">${(order.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>

              {order.status === "delivered" && !order.reviewed && (
                <div className="mt-4 pt-4 border-t">
                  <Link
                    to={`/review/order/${order._id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Write a Review
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
