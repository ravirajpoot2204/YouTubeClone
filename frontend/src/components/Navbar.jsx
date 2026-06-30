"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Upload, LogOut, Plus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import UploadModal from "@/components/UploadModal";

export default function Navbar() {
  const router = useRouter();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dropdownRef = useRef(null);
  const addDropdownRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
        setAddDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    logout();
    router.push("/login");
  };

  const avatarUrl =
    user?.avatar?.startsWith("http")
      ? user.avatar
      : `${process.env.NEXT_PUBLIC_STATIC_URL}${user?.avatar || "/default_avatar.png"}`;

  // Skeleton while mounting
  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-red-600">YouTube Clone</Link>
          <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        {/* ... all the existing navbar content ... */}
        {/* (Keep everything inside <nav> exactly as you have it) */}
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">▶️</span>
            <span className="text-xl font-bold text-red-600 hidden sm:block">YouTube Clone</span>
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
                {/* + ADD BUTTON */}
                <div className="relative" ref={addDropdownRef}>
                  <button
                    onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-700"
                    aria-label="Add new content"
                  >
                    <Plus size={20} />
                  </button>

                  {addDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                      onMouseLeave={() => setAddDropdownOpen(false)}
                    >
                      {!user.channel && (
                        <Link
                          href="/create-channel"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition"
                          onClick={() => setAddDropdownOpen(false)}
                        >
                          <span className="text-lg">📺</span> Create Channel
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setAddDropdownOpen(false);
                          setUploadModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition w-full text-left"
                      >
                        <span className="text-lg">⬆️</span> Upload Video
                      </button>

                      <Link
                        href="/go-live"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition"
                        onClick={() => setAddDropdownOpen(false)}
                      >
                        <span className="text-lg">🔴</span> Go Live
                      </Link>

                      <Link
                        href="/create-post"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition border-t border-gray-100"
                        onClick={() => setAddDropdownOpen(false)}
                      >
                        <span className="text-lg">✏️</span> Create Post
                      </Link>
                    </div>
                  )}
                </div>

                {/* User avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
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
                        <p className="font-medium text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      {!user.channel ? (
                        <Link
                          href="/create-channel"
                          className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Create Channel
                        </Link>
                      ) : (
                        <>
                          <Link
                            href={`/channel/${user.channel.username || user.channel.id}`}
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                            onClick={() => setDropdownOpen(false)}
                          >
                            My Channel
                          </Link>
                          <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
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
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2"
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

      {/* ============ MODAL ADDED HERE ============ */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </>
  );
}