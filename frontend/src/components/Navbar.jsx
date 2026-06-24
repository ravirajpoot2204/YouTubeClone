"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Upload, User, LogOut } from "lucide-react";

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null); // Baad mein auth store se ayega

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${searchQuery}`;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">📺</span>
          <span className="text-xl font-bold text-red-600 hidden sm:block">
            StreamApp
          </span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/upload">
                <button className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 text-sm font-medium">
                  <Upload size={16} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </Link>
              
              <Link href="/dashboard">
                <img
                  src={user.avatar || "/default-avatar.png"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              </Link>
              
              <button onClick={logout} className="text-gray-600 hover:text-gray-900" title="Logout">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link href="/login">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 text-sm font-medium">
                <User size={16} />
                <span>Sign In</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}