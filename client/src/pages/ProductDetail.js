import React, { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import axios from "../api/axios"
import { useCart } from "../contexts/CartContext"
import { useAuth } from "../contexts/AuthContext"
import { useWishlist } from "../contexts/WishlistContext"
import toast from "react-hot-toast"
import { Star, ShoppingCart, Minus, Plus, Heart, Check, Edit, Trash2, X, Eye } from "lucide-react"
import Loader from "../components/Layout/Loader"
import ProductCard from "../components/Products/ProductCard"

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [ratingStats, setRatingStats] = useState([])
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    title: "",
    comment: "",
  })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [userReview, setUserReview] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCartNotification, setShowCartNotification] = useState(false)

  const { addToCart } = useCart()
  const { isAuthenticated, user } = useAuth()
  const { addToWishlist, removeFromWishlist, isProductInWishlist } = useWishlist()

  const isAdmin = isAuthenticated && user?.role === "admin"

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      try {
        setLoading(true)
        const productRes = await axios.get(`/products/${id}`)
        setProduct(productRes.data)

        const reviewsRes = await axios.get(`/reviews/product/${id}`)
        setReviews(reviewsRes.data.reviews || [])
        setRatingStats(reviewsRes.data.ratingStats || [])

        if (productRes.data.category) {
          const relatedRes = await axios.get(
            `/products?category=${productRes.data.category._id}&limit=5`
          )
          setRelatedProducts(
            relatedRes.data.products.filter(p => p._id !== id)
          )
        }

        // Check if user has already reviewed this product
        if (isAuthenticated) {
          try {
            const userReviewRes = await axios.get('/reviews/my-reviews')
            const existingReview = userReviewRes.data.find(r => r.product._id === id || r.product === id)
            if (existingReview) {
              setUserReview(existingReview)
              
              // Also mark this review in the reviews list
              setReviews(prevReviews => 
                prevReviews.map(r => 
                  r._id === existingReview._id ? { ...r, isUserReview: true } : r
                )
              )
            }
          } catch (err) {
            console.error("Failed to fetch user reviews:", err)
          }
        }

        setError(null)
      } catch (err) {
        console.error("Failed to fetch product details:", err)
        setError("Product not found or an error occurred.")
      } finally {
        setLoading(false)
      }
    }

    fetchProductAndReviews()
  }, [id, isAuthenticated])

  const handleQuantityChange = (amount) => {
    setQuantity((prev) => {
      const newQuantity = prev + amount
      if (newQuantity < 1) return 1
      if (newQuantity > product.stockQuantity) return product.stockQuantity
      return newQuantity
    })
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to add items to your cart.")
      return
    }
    if (product.stockQuantity < quantity) {
        toast.error("Not enough stock available.");
        return;
    }
    
    const result = await addToCart(product._id, quantity)
    if (result.success) {
      setShowCartNotification(true)
      setTimeout(() => {
        setShowCartNotification(false)
      }, 5000) // Hide after 5 seconds
    }
  }

  const handleViewCart = () => {
    navigate('/cart')
  }

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to manage your wishlist");
      return;
    }
    const inWishlist = isProductInWishlist(product._id);
    if (inWishlist) {
      await removeFromWishlist(product._id);
      toast.success("Removed from wishlist");
    } else {
      await addToWishlist(product._id);
      toast.success("Added to wishlist");
    }
  };

  const handleReviewFormChange = (e) => {
    const { name, value } = e.target;
    setReviewFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to submit a review");
      return;
    }

    try {
      setReviewSubmitting(true);
      
      if (isEditingReview) {
        // Update existing review
        const response = await axios.put(`/reviews/${userReview._id}`, {
          rating: parseInt(reviewFormData.rating),
          title: reviewFormData.title.trim(),
          comment: reviewFormData.comment.trim()
        });
        
        // Update the review in the list
        setReviews(prev => prev.map(r => 
          r._id === userReview._id ? response.data.review : r
        ));
        
        setUserReview(response.data.review);
        setIsEditingReview(false);
        toast.success("Review updated successfully");
      } else {
        // Create new review
        console.log("Submitting review with data:", {
          product: id,
          rating: parseInt(reviewFormData.rating),
          title: reviewFormData.title.trim(),
          comment: reviewFormData.comment.trim()
        });
        
        const response = await axios.post('/reviews', {
          product: id,
          rating: parseInt(reviewFormData.rating),
          title: reviewFormData.title.trim(),
          comment: reviewFormData.comment.trim()
        });

        console.log("Review submission response:", response.data);
        
        // Add the new review to the reviews list
        setReviews(prev => [response.data.review, ...prev]);
        setUserReview(response.data.review);
        toast.success("Review submitted successfully");
      }
      
      setShowReviewForm(false);
      setReviewFormData({ rating: 5, title: "", comment: "" });

      // Refresh product to get updated rating
      const productRes = await axios.get(`/products/${id}`);
      setProduct(productRes.data);

      // Refresh rating stats
      const reviewsRes = await axios.get(`/reviews/product/${id}`);
      setRatingStats(reviewsRes.data.ratingStats || []);
    } catch (err) {
      console.error("Failed to submit review:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      toast.error(err.response?.data?.message || "Failed to submit review. Please try again later.");
    } finally {
      setReviewSubmitting(false);
    }
  };
  
  const handleEditReview = () => {
    setReviewFormData({
      rating: userReview.rating,
      title: userReview.title || "",
      comment: userReview.comment
    });
    setIsEditingReview(true);
    setShowReviewForm(true);
  };
  
  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    try {
      // Ensure the token is in the request headers
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/reviews/${userReview._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200) {
        // Remove the review from the list
        setReviews(prev => prev.filter(r => r._id !== userReview._id));
        setUserReview(null);
        setShowDeleteConfirm(false);
        toast.success("Review deleted successfully");
        
        // Refresh product to get updated rating
        const productRes = await axios.get(`/products/${id}`);
        setProduct(productRes.data);
        
        // Refresh rating stats
        const reviewsRes = await axios.get(`/reviews/product/${id}`);
        setRatingStats(reviewsRes.data.ratingStats || []);
      }
    } catch (err) {
      console.error("Failed to delete review:", err);
      toast.error(err.response?.data?.message || "Failed to delete review");
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
      />
    ))
  }

  const renderRatingInput = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setReviewFormData(prev => ({ ...prev, rating: i + 1 }))}
        className="focus:outline-none"
      >
        <Star
          className={`w-6 h-6 ${
            i < reviewFormData.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      </button>
    ))
  }

  const calculateRatingPercentage = (rating) => {
    if (!ratingStats || !Array.isArray(ratingStats)) return 0;
    const ratingCount = ratingStats.find(stat => stat?._id === rating)?.count || 0;
    const totalReviews = product?.reviewCount || 0;
    return totalReviews > 0 ? (ratingCount / totalReviews) * 100 : 0;
  };

  if (loading) return <Loader />
  if (error) return <div className="text-center text-red-500 py-12">{error}</div>
  if (!product) return null

  // Check if product has images and if they are objects or strings
  const hasImages = product.images && product.images.length > 0;
  const isImageObject = hasImages && typeof product.images[0] === 'object';
  
  // Get the current active image URL
  const activeImageSrc = hasImages 
    ? (isImageObject ? product.images[activeImage]?.url : product.images[activeImage]) 
    : '';

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Cart Added Notification */}
      {showCartNotification && (
        <div className="fixed top-20 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-lg flex items-center justify-between max-w-sm">
          <div className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span>Item added to cart!</span>
          </div>
          <div className="flex items-center ml-4">
            <button 
              onClick={handleViewCart}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 mr-2 flex items-center"
            >
              <Eye className="w-4 h-4 mr-1" /> View Cart
            </button>
            <button 
              onClick={() => setShowCartNotification(false)}
              className="text-green-700 hover:text-green-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <div className="border rounded-lg overflow-hidden mb-4">
            {hasImages ? (
              <img
                src={activeImageSrc}
                alt={`${product.name} ${activeImage + 1}`}
                className="w-full h-auto object-cover aspect-square"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>
          {hasImages && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`w-20 h-20 border rounded-md overflow-hidden flex-shrink-0 ${activeImage === index ? 'border-blue-500' : ''}`}>
                  <img 
                    src={isImageObject ? img.url : img} 
                    alt={isImageObject ? (img.alt || `${product.name} thumbnail ${index + 1}`) : `${product.name} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center mb-4">
            <div className="flex mr-4">{renderStars(product.averageRating)}</div>
            <span className="text-gray-600">({product.reviewCount} reviews)</span>
          </div>
          <p className="text-gray-700 mb-6">{product.description}</p>

          <div className="mb-6">
            <span className="text-3xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
            {product.comparePrice && (
              <span className="text-lg text-gray-500 line-through ml-2">${product.comparePrice.toFixed(2)}</span>
            )}
          </div>

          {/* SKU and Stock */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            {product.sku && (
              <div>
                <span className="text-gray-600 font-medium">SKU:</span> {product.sku}
              </div>
            )}
            <div>
              <span className="text-gray-600 font-medium">Availability:</span> 
              <span className={`ml-1 ${product.stockQuantity > 0 ? "text-green-600" : "text-red-600"}`}>
                {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : "Out of Stock"}
              </span>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Specifications</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <dl className="grid grid-cols-1 gap-2">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-2">
                      <dt className="text-gray-600 font-medium">{spec.name}:</dt>
                      <dd>{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          <div className="flex items-center mb-6">
            <span className="mr-4 font-semibold">Quantity:</span>
            <div className="flex items-center border rounded-md">
              <button onClick={() => handleQuantityChange(-1)} className="p-2"><Minus size={16} /></button>
              <span className="px-4 py-1 font-bold">{quantity}</span>
              <button onClick={() => handleQuantityChange(1)} className="p-2"><Plus size={16} /></button>
            </div>
          </div>

          {/* Add to Cart and Wishlist buttons - Only show for non-admin users */}
          {!isAdmin && (
            <>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleAddToCart}
              disabled={product.stockQuantity === 0}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg flex items-center justify-center text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              <ShoppingCart className="mr-2" size={20} />
              Add to Cart
            </button>

            <button
              onClick={handleWishlistToggle}
              className="p-3 rounded-full border-2 border-gray-200 text-gray-700 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all duration-200"
              aria-label="Toggle Wishlist"
            >
              <Heart
                className={`w-6 h-6 transition-all ${
                  isProductInWishlist(product._id)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-600'
                }`}
              />
            </button>
          </div>

          {/* View Cart Button */}
          <div className="mt-4">
            <Link
              to="/cart"
              className="w-full bg-gray-100 text-gray-800 py-2 px-6 rounded-lg flex items-center justify-center text-base hover:bg-gray-200 transition border border-gray-300"
            >
              <ShoppingCart className="mr-2" size={16} />
              View Cart
            </Link>
          </div>
            </>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mt-6">
              <div className="text-sm text-gray-600">Tags:</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {product.tags.map((tag, index) => (
                  <Link 
                    key={index}
                    to={`/products?search=${tag}`}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <div className="flex justify-between items-center border-b pb-4 mb-8">
          <h2 className="text-3xl font-bold">Customer Reviews</h2>
          {isAuthenticated && !userReview && !showReviewForm && (
            <button 
              onClick={() => setShowReviewForm(true)} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Write a Review
            </button>
          )}
          {isAuthenticated && userReview && !showReviewForm && (
            <div className="flex space-x-2">
              <button 
                onClick={handleEditReview} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <Edit size={16} className="mr-1" /> Edit Review
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center"
              >
                <Trash2 size={16} className="mr-1" /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Delete Review</h3>
                <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <p className="mb-6">Are you sure you want to delete your review? This action cannot be undone.</p>
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteReview}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h3 className="text-xl font-bold mb-4">{isEditingReview ? "Edit Your Review" : "Write Your Review"}</h3>
            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Rating</label>
                <div className="flex">{renderRatingInput()}</div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="title" className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={reviewFormData.title}
                  onChange={handleReviewFormChange}
                  className="w-full border border-gray-300 rounded p-2"
                  placeholder="Summarize your review"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="comment" className="block text-gray-700 mb-2">Review</label>
                <textarea
                  id="comment"
                  name="comment"
                  value={reviewFormData.comment}
                  onChange={handleReviewFormChange}
                  className="w-full border border-gray-300 rounded p-2"
                  rows="4"
                  placeholder="What did you like or dislike about this product? (Minimum 3 characters)"
                  required
                  minLength="3"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Minimum 3 characters required</p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewForm(false);
                    if (isEditingReview) setIsEditingReview(false);
                  }}
                  className="mr-2 px-4 py-2 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {reviewSubmitting ? "Submitting..." : isEditingReview ? "Update Review" : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rating Summary */}
        {product.reviewCount > 0 && (
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/4 mb-4 md:mb-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold text-blue-600">{product.averageRating.toFixed(1)}</div>
                <div className="flex mt-2">{renderStars(product.averageRating)}</div>
                <div className="text-gray-600 mt-1">{product.reviewCount} reviews</div>
              </div>
              
              <div className="md:w-3/4 md:pl-8">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center mb-2">
                    <div className="w-12 text-sm text-gray-600">{rating} stars</div>
                    <div className="w-full mx-4 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-yellow-400 h-2.5 rounded-full" 
                        style={{ width: `${calculateRatingPercentage(rating)}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm text-gray-600">
                      {ratingStats?.find?.(stat => stat?._id === rating)?.count || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review List */}
        {reviews.length > 0 ? (
          <div className="space-y-8">
            {reviews.map((review) => (
              <div key={review._id} className="border-b pb-6">
                <div className="flex items-center mb-2">
                  <div className="flex mr-2">{renderStars(review.rating)}</div>
                  <h3 className="font-bold text-lg">{review.title}</h3>
                  {isAuthenticated && user && review.user._id === user._id && (
                    <span className="ml-2 text-sm text-blue-600">(Your review)</span>
                  )}
                </div>
                <p className="text-gray-600 mb-3">{review.comment}</p>
                <div className="text-sm text-gray-500">
                  <span>{review.user.firstName} {review.user.lastName}</span>
                  <span className="mx-2">|</span>
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  {review.isVerified && (
                    <span className="text-green-600 font-semibold ml-2 flex items-center">
                      <Check size={16} className="mr-1" /> Verified Purchase
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No reviews for this product yet.</p>
        )}
      </div>

      {/* Related Products Section */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold mb-8 border-b pb-4">Related Products</h2>
        {relatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        ) : (
          <p>No related products found.</p>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
