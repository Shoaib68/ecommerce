import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get('/wishlist');
      setWishlist(response.data);
    } catch (error) {
      console.error('Failed to fetch wishlist', error);
      setWishlist(null); // Reset on error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [isAuthenticated, user, fetchWishlist]);

  const addToWishlist = async (productId) => {
    try {
      const response = await axios.post('/wishlist', { productId });
      setWishlist(response.data);
    } catch (error) {
      console.error('Failed to add to wishlist', error);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const response = await axios.delete(`/wishlist/${productId}`);
      setWishlist(response.data);
    } catch (error) {
      console.error('Failed to remove from wishlist', error);
    }
  };

  const isProductInWishlist = (productId) => {
    return wishlist?.products?.some((p) => p._id === productId) || false;
  };

  const value = {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isProductInWishlist,
    itemCount: wishlist?.products?.length || 0,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
