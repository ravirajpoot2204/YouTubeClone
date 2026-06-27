"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Upload, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${searchQuery}`;
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    }
    logout(); // clears user/token from store
    router.push("/login");
  };

  // Build full avatar URL (fallback if none)
  const avatarUrl =
  user?.avatar?.startsWith("http")
    ? user.avatar
    : `${process.env.NEXT_PUBLIC_STATIC_URL}${user?.avatar || "/default_avatar.png"}`;
  // Show a skeleton while mounting to avoid hydration mismatch
  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-red-600">StreamApp</Link>
          <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">📺</span>
          <span className="text-xl font-bold text-red-600 hidden sm:block">StreamApp</span>
        </Link>

        {/* Search */}
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

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Upload button */}
              <Link href="/upload">
                <button className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 text-sm font-medium">
                  <Upload size={16} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </Link>

              {/* User avatar + dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2"
                >
                  <img
                    src={avatarUrl}
                    alt={user.name || "User"}
                    className="w-8 h-8 rounded-full object-cover bg-gray-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default_avatar.png";
                    }}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="p-3 border-b border-gray-100">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    {!user.channel ? (
                      <Link
                        href="/create-channel"
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Create Channel
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/channel/${user.channel.username || user.channel.id}`}
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => setDropdownOpen(false)}
                        >
                          My Channel
                        </Link>
                        <Link
                          href="/dashboard"
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Dashboard
                        </Link>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-500 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 text-sm font-medium">
                Sign In
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}