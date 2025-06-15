"use client"
import { Link } from "react-router-dom"
import { Star, ShoppingCart, Heart } from "lucide-react"
import { useCart } from "../../contexts/CartContext"
import { useAuth } from "../../contexts/AuthContext"
import { useWishlist } from "../../contexts/WishlistContext"
import toast from "react-hot-toast"

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()
  const { isAuthenticated, user } = useAuth()
  const { addToWishlist, removeFromWishlist, isProductInWishlist } = useWishlist()
  
  const isAdmin = isAuthenticated && user?.role === "admin"

  const handleAddToCart = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error("Please login to add items to cart")
      return
    }
    await addToCart(product._id)
  }

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ))
  }

  const imageUrl = (product.images && product.images.length > 0) ? product.images[0].url : "/placeholder-product.jpg";

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative group">
        <Link to={`/products/${product._id}`}>
          <div className="aspect-square overflow-hidden">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
        {!isAdmin && (
        <button
          onClick={handleWishlistToggle}
          className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-full text-gray-700 hover:text-red-500 hover:bg-white transition-all duration-200 z-10"
          aria-label="Toggle Wishlist"
        >
          <Heart
            className={`w-5 h-5 transition-all ${
              isProductInWishlist(product._id)
                ? 'fill-red-500 text-red-500'
                : 'text-gray-600'
            }`}
          />
        </button>
        )}
      </div>

      <div className="p-4">
        <Link to={`/products/${product._id}`}>
          <h3 className="font-semibold text-lg mb-2 hover:text-blue-600 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center mb-2">
          <div className="flex">{renderStars(product.averageRating)}</div>
          <span className="text-sm text-gray-600 ml-2">({product.reviewCount} reviews)</span>
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-green-600">${product.price.toFixed(2)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-500 line-through">${product.comparePrice.toFixed(2)}</span>
            )}
          </div>

          {!isAdmin && (
          <button
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              product.stockQuantity === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{product.stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}</span>
          </button>
          )}
        </div>

        {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <p className="text-orange-600 text-sm mt-2">Only {product.stockQuantity} left in stock!</p>
        )}
      </div>
    </div>
  )
}

export default ProductCard
