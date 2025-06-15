import React, { useState } from "react";
import { Star } from "lucide-react";
import axios from "../../api/axios";
import { toast } from "react-hot-toast";

const ReviewForm = ({ productId, existingReview, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    rating: existingReview?.rating || 5,
    title: existingReview?.title || "",
    comment: existingReview?.comment || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingReview) {
        await axios.put(`/api/reviews/${existingReview._id}`, formData);
        toast.success("Review updated successfully");
      } else {
        await axios.post("/api/reviews", {
          ...formData,
          product: productId,
        });
        toast.success("Review submitted successfully");
      }
      onSuccess();
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setFormData((prev) => ({ ...prev, rating: i + 1 }))}
        className="focus:outline-none"
      >
        <Star
          className={`w-8 h-8 ${
            i < formData.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      </button>
    ));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
        <div className="flex space-x-2">{renderStars()}</div>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Summarize your review"
          maxLength={100}
        />
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Review
        </label>
        <textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          placeholder="Share your experience with this product"
          minLength={10}
          maxLength={1000}
          required
        />
      </div>

      <div className="flex justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {loading ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm; 