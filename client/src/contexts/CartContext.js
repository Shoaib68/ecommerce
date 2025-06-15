import { createContext, useContext, useReducer, useEffect } from "react"
import axios from "../api/axios"
import toast from "react-hot-toast"
import { useAuth } from "./AuthContext"

const CartContext = createContext()

const initialState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
  loading: false,
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_CART":
      return {
        ...state,
        items: action.payload.items || [],
        totalAmount: action.payload.totalAmount || 0,
        totalItems: action.payload.totalItems || 0,
        loading: false,
      }
    case "CLEAR_CART":
      return {
        ...state,
        items: [],
        totalAmount: 0,
        totalItems: 0,
      }
    default:
      return state
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { isAuthenticated, user } = useAuth()

  // Fetch cart when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCart()
    } else {
      dispatch({ type: "CLEAR_CART" })
    }
  }, [isAuthenticated, user])

  const fetchCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const response = await axios.get("/cart")
      dispatch({ type: "SET_CART", payload: response.data })
    } catch (error) {
      console.error("Fetch cart error:", error)
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const addToCart = async (productId, quantity = 1) => {
    try {
      await axios.post("/cart/add", { productId, quantity })
      await fetchCart()
      toast.success("Item added to cart!")
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to add item to cart"
      toast.error(message)
      return { success: false, message }
    }
  }

  const updateQuantity = async (productId, quantity) => {
    try {
      await axios.put("/cart/update", { productId, quantity })
      await fetchCart()
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update quantity"
      toast.error(message)
      return { success: false, message }
    }
  }

  const removeFromCart = async (productId) => {
    try {
      await axios.delete(`/cart/remove/${productId}`)
      await fetchCart()
      toast.success("Item removed from cart")
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to remove item"
      toast.error(message)
      return { success: false, message }
    }
  }

  const clearCart = async () => {
    try {
      await axios.delete("/cart/clear")
      dispatch({ type: "CLEAR_CART" })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to clear cart"
      toast.error(message)
      return { success: false, message }
    }
  }

  const value = {
    ...state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
