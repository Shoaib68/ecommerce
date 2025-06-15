import React, { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "../api/axios"
import ProductCard from "../components/Products/ProductCard"
import Loader from "../components/Layout/Loader"

const Products = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)

  const [filters, setFilters] = useState({
    category: params.get("category") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/categories")
        setCategories(response.data.categories)
      } catch (err) {
        console.error("Failed to fetch categories:", err)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const currentParams = new URLSearchParams(location.search)
        const response = await axios.get("/products", {
          params: {
            category: currentParams.get("category"),
            minPrice: currentParams.get("minPrice"),
            maxPrice: currentParams.get("maxPrice"),
          },
        })
        setProducts(response.data.products)
        setError(null)
      } catch (error) {
        console.error("Error fetching products:", error)
        setError("Failed to load products. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [location.search])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const applyFilters = () => {
    const newParams = new URLSearchParams()
    if (filters.category) newParams.set("category", filters.category)
    if (filters.minPrice) newParams.set("minPrice", filters.minPrice)
    if (filters.maxPrice) newParams.set("maxPrice", filters.maxPrice)
    navigate(`?${newParams.toString()}`)
  }

  const clearFilters = () => {
    setFilters({ category: "", minPrice: "", maxPrice: "" })
    navigate("/products")
  }

  return (
    <div className="container mx-auto px-4 py-8 flex">
      {/* Filters Sidebar */}
      <aside className="w-1/4 pr-8">
        <h2 className="text-2xl font-bold mb-6">Filters</h2>
        <div className="space-y-6">
          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                name="minPrice"
                placeholder="Min"
                value={filters.minPrice}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
              <span>-</span>
              <input
                type="number"
                name="maxPrice"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={applyFilters}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </aside>

      {/* Products Grid */}
      <main className="w-3/4">
        <h1 className="text-3xl font-bold mb-8">Our Products</h1>
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p>No products found matching your criteria.</p>
            <p>Try adjusting your filters or clearing them to see all products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Products