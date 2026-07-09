"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function GoLivePage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const isLoggedIn = !!token;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">You must be logged in to go live.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/live/start", {
        title,
        description,
        visibility,
      });
      // Redirect to the live stream page
      router.push(`/live/${data.stream._id}`);
    } catch (err) {
      console.error("Failed to start live stream:", err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="min-h-screen bg-white text-gray-900">
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Go Live</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400"
            rows={3}
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </div>

        {/* Error message */}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Starting…" : "Start Live Stream"}
        </button>
      </form>
    </div>
  </div>
);
}