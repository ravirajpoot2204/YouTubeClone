"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/axios";

export default function SuggestedVideos({ videoId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;
    const fetchSuggestions = async () => {
      try {
        const res = await api.get(`/videos/${videoId}/suggested`);
        setSuggestions(res.data.videos || []);
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [videoId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-40 h-24 bg-gray-200 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return <p className="text-gray-500 text-sm">No suggestions available</p>;
  }

  return (
    <div className="space-y-4">
      {suggestions.map((sug) => (
        <Link
          key={sug._id}
          href={`/watch/${sug.videoId || sug._id}`}
          className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 transition"
        >
          <div className="relative w-40 h-24 flex-shrink-0">
            <Image
              src={sug.thumbnail || "/default-thumbnail.jpg"}
              alt={sug.title}
              fill
              className="object-cover rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 line-clamp-2">{sug.title}</p>
            <p className="text-xs text-gray-500 mt-1">{sug.uploadedBy?.name || "Unknown"}</p>
            <p className="text-xs text-gray-400">{sug.views || 0} views</p>
          </div>
        </Link>
      ))}
    </div>
  );
}