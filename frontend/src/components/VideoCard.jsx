import Link from "next/link";
import api from "@/lib/axios";
export default function VideoCard({ video, isOwner, onEdit, onDelete }) {

  const timeAgo = (date) => {
    const now = new Date();
    const uploaded = new Date(date);
    const diff = Math.floor((now.getTime() - uploaded.getTime()) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    return uploaded.toLocaleDateString();
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="group relative">
      
      <Link href={`/watch/${video._id}`} className="space-y-2 block">
        <div className="relative aspect-video bg-gray-200 rounded-xl overflow-hidden">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </div>
        <div className="flex gap-3">
          <img
            src={video.uploadedBy?.avatar || "/default-avatar.png"}
            className="w-9 h-9 rounded-full flex-shrink-0 mt-1"
            alt=""
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
              {video.title}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {video.uploadedBy?.name || "Unknown"}
            </p>
            <p className="text-xs text-gray-600">
              {formatViews(video.views)} views • {timeAgo(video.uploadedAt)}
            </p>
          </div>
        </div>
      </Link>

      {/* ✨ Owner action buttons (overlaid on thumbnail) */}
      {isOwner && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit(video._id);
            }}
            className="bg-black/60 hover:bg-black/80 p-1.5 rounded text-white text-xs"
            title="Edit video"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(video._id);
            }}
            className="bg-black/60 hover:bg-black/80 p-1.5 rounded text-white text-xs"
            title="Delete video"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}