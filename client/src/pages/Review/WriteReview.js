import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import ReviewForm from "../../components/Reviews/ReviewForm";
import LoadingSpinner from "../../components/UI/LoadingSpinner";

const WriteReview = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await axios.get(`/api/orders/${orderId}`);
        setOrder(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

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

  if (!order) return null;

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleReviewSuccess = () => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Write a Review</h1>

      {!selectedProduct ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a product to review</h2>
          <div className="grid gap-4">
            {order.items.map((item) => (
              <div
                key={item.product._id}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProductSelect(item.product)}
              >
                <div className="flex items-center">
                  <div className="w-16 h-16 flex-shrink-0">
                    <img
                      src={item.product.images[0]?.url || "/placeholder-product.jpg"}
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-8">
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to product selection
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <div className="w-20 h-20 flex-shrink-0">
                <img
                  src={selectedProduct.images[0]?.url || "/placeholder-product.jpg"}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
                <p className="text-gray-600">{selectedProduct.description}</p>
              </div>
            </div>

            <ReviewForm
              productId={selectedProduct._id}
              onSuccess={handleReviewSuccess}
              onCancel={() => setSelectedProduct(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteReview; 