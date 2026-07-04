"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThumbsUp, ThumbsDown, Share2, Clock, Eye } from "lucide-react";
import api from "@/lib/axios";
import VideoPlayer from "@/components/VideoPlayer";
import SuggestedVideos from "@/components/SuggestedVideos";

export default function WatchPage() {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  useEffect(() => {
    if (!videoId) return;

    const fetchVideo = async () => {
      try {
        const res = await api.get(`/videos/${videoId}`);
        setVideo(res.data.video);
        setLiked(res.data.video.liked || false);
        setDisliked(res.data.video.disliked || false);
      } catch (err) {
        console.error("Failed to fetch video:", err);
        setError("Video not found or unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  const handleLike = async () => {
    // TODO: implement API call to toggle like
    setLiked(!liked);
    if (disliked) setDisliked(false);
  };

  const handleDislike = async () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-gray-500">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error || "Video not found"}</div>
      </div>
    );
  }

// ✅ CORRECT (no /api)
const hlsSrc = `/uploads/hls/${video.videoId || video._id}/master.m3u8`;
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main column */}
        <div className="flex-1">
          <VideoPlayer
            src={hlsSrc}
            poster={video.thumbnail || "/default-thumbnail.jpg"}
            isLive={video.isLive || false}
          />

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
            <div className="flex flex-wrap items-center justify-between mt-2 text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Eye size={16} /> {video.views || 0} views
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} /> {new Date(video.uploadDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${
                    liked ? "bg-blue-50 border-blue-300 text-blue-600" : "hover:bg-gray-50"
                  }`}
                >
                  <ThumbsUp size={16} />
                  <span>{video.likes || 0}</span>
                </button>
                <button
                  onClick={handleDislike}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${
                    disliked ? "bg-red-50 border-red-300 text-red-600" : "hover:bg-gray-50"
                  }`}
                >
                  <ThumbsDown size={16} />
                  <span>{video.dislikes || 0}</span>
                </button>
                <button className="flex items-center gap-1 px-3 py-1 rounded-full border hover:bg-gray-50">
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>

            {video.uploadedBy && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={video.uploadedBy.avatar || "/default-avatar.png"}
                    alt={video.uploadedBy.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{video.uploadedBy.name}</p>
                    <p className="text-xs text-gray-500">@{(video.uploadedBy.username || "channel")}</p>
                  </div>
                </div>
                <button className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-700">
                  Subscribe
                </button>
              </div>
            )}

            {video.description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Comments</h3>
              <div className="text-gray-500 text-sm">Comments feature coming soon</div>
            </div>
          </div>
        </div>

        <div className="lg:w-96">
          <h3 className="text-lg font-semibold mb-4">Suggested Videos</h3>
          <SuggestedVideos videoId={videoId} />
        </div>
      </div>
    </div>
  );
}