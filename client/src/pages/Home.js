import { Link } from "react-router-dom"
import { useQuery } from "react-query"
import axios from "../api/axios"
import ProductCard from "../components/Products/ProductCard"
import LoadingSpinner from "../components/UI/LoadingSpinner"
import { ShoppingBag, Star, Truck, Shield, Laptop, BookOpen, Shirt, Home as HomeIcon, Gamepad2, Tent } from "lucide-react"

const fetchFeaturedProducts = async () => {
  const response = await axios.get("/products?limit=8&sort=-createdAt")
  return response.data
}

const fetchCategories = async () => {
  const response = await axios.get("/categories?limit=6")
  return response.data
}

// Function to get category icon based on category name
const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('electronic')) return Laptop;
  if (name.includes('book')) return BookOpen;
  if (name.includes('apparel')) return Shirt;
  if (name.includes('home')) return HomeIcon;
  if (name.includes('game')) return Gamepad2;
  if (name.includes('outdoor')) return Tent;
  
  // Default icon if no match
  return ShoppingBag;
};

// Function to get category color based on category name
const getCategoryColor = (categoryName) => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('electronic')) return 'bg-blue-100 text-blue-600';
  if (name.includes('book')) return 'bg-yellow-100 text-yellow-600';
  if (name.includes('apparel')) return 'bg-pink-100 text-pink-600';
  if (name.includes('home')) return 'bg-green-100 text-green-600';
  if (name.includes('game')) return 'bg-purple-100 text-purple-600';
  if (name.includes('outdoor')) return 'bg-orange-100 text-orange-600';
  
  // Default color if no match
  return 'bg-gray-200 text-gray-600';
};

const Home = () => {
  const { data: productsData, isLoading: productsLoading } = useQuery("featured-products", fetchFeaturedProducts)

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery("categories", fetchCategories)

  return (
    <div className="min-h-screen">
      {/* Hero Section with animated background */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
          <div className="bubble bubble-4"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl font-bold mb-6 animate-fadeIn">Welcome to E-Market</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto animate-slideUp">
            Discover amazing products at unbeatable prices. Shop with confidence and enjoy fast, secure delivery.
          </p>
          <Link
            to="/products"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center hover:scale-105 transform transition-transform duration-200"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Shop Now
          </Link>
        </div>
      </section>

      {/* Features Section with hover effects */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center hover:transform hover:scale-105 transition-all duration-300 p-6 rounded-lg hover:shadow-lg">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Free shipping on orders over $50. Get your products delivered quickly and safely.
              </p>
            </div>
            <div className="text-center hover:transform hover:scale-105 transition-all duration-300 p-6 rounded-lg hover:shadow-lg">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payment</h3>
              <p className="text-gray-600">
                Your payment information is encrypted and secure with our trusted payment partners.
              </p>
            </div>
            <div className="text-center hover:transform hover:scale-105 transition-all duration-300 p-6 rounded-lg hover:shadow-lg">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Products</h3>
              <p className="text-gray-600">
                We carefully curate our products to ensure you get the best quality and value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section with dynamic icons */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative">
        {/* Background pattern */}
        <div className="absolute inset-0 pattern-dots opacity-10 z-0"></div>
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          {categoriesLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categoriesData?.categories?.map((category) => {
                const IconComponent = getCategoryIcon(category.name);
                const colorClass = getCategoryColor(category.name);
                
                return (
                  <Link
                    key={category._id}
                    to={`/products?category=${category._id}`}
                    className="bg-white rounded-lg p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
                  >
                    <div className={`w-16 h-16 ${colorClass.split(' ')[0]} rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`w-8 h-8 ${colorClass.split(' ')[1]}`} />
                    </div>
                    <h3 className="font-semibold group-hover:text-blue-600 transition-colors">{category.name}</h3>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section with animation */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link to="/products" className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-all">
              View All Products →
            </Link>
          </div>
          {productsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productsData?.products?.map((product) => (
                <div key={product._id} className="animate-fadeIn">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="bubble bubble-1 opacity-20"></div>
          <div className="bubble bubble-2 opacity-20"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Subscribe to Our Newsletter</h2>
            <p className="text-lg mb-8">
              Stay updated with our latest products and exclusive offers. No spam, we promise!
            </p>
            <form className="flex flex-col md:flex-row gap-4">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors hover:scale-105 transform transition-transform duration-200"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
