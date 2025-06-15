import React from 'react';
import { useWishlist } from '../contexts/WishlistContext';
import ProductCard from '../components/Products/ProductCard';
import Loader from '../components/Layout/Loader';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  const { wishlist, loading } = useWishlist();

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
      {wishlist && wishlist.products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl text-gray-600 mb-4">Your wishlist is empty.</p>
          <Link to="/products" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Find products you'll love
          </Link>
        </div>
      )}
    </div>
  );
};

export default Wishlist;
