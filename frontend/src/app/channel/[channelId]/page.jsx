"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import VideoCard from "@/components/VideoCard";
import ConfirmPinModal from "@/components/ConfirmPinModal";   // ✅ updated import

export default function ChannelPage() {
  const router = useRouter();
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const { user } = useAuthStore();
  const [videos, setVideos] = useState([]);

  // Delete flow states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  // Ownership check
  const isOwner = user && channel && channel.owner &&
    String(channel.owner._id) === (user.id ? String(user.id) : String(user._id));

  // Fetch channel data and its videos
  useEffect(() => {
    if (!channelId) return;
    api.get(`/channels/${channelId}`).then(res => {
      setChannel(res.data.channel);
    }).catch(err => console.error("Failed to load channel", err));

    api.get(`/videos/channel/${channelId}`).then(res => {
      setVideos(res.data.videos || []);
    }).catch(err => console.error("Failed to load videos", err));
  }, [channelId]);

  // Request deletion (opens PIN modal)
  const handleDeleteRequest = (videoId) => {
    setVideoToDelete(videoId);
    setDeleteModalOpen(true);
  };

  // Confirm deletion with PIN
  const handleConfirmDelete = async (pin) => {
    if (!videoToDelete) return;
    // Send the PIN to the backend (which now expects `pin`)
    await api.delete(`/videos/${videoToDelete}`, { data: { pin } });
    setVideos((prev) => prev.filter((v) => v._id !== videoToDelete));
    setVideoToDelete(null);
  };

  // Edit handler
  const handleEdit = (videoId) => {
    router.push(`/edit-video/${videoId}`);
  };

  if (!channel) return <div className="p-8 text-center text-gray-900">Loading channel…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 text-gray-900 bg-white min-h-screen">
      {/* Channel header */}
      <div className="flex items-center gap-4 mb-8">
        <Image
          src={channel.avatar || "/default-avatar.png"}
          alt={channel.name}
          width={80}
          height={80}
          className="rounded-full object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold">{channel.name}</h1>
          <p className="text-gray-600">@{channel.username}</p>
          {channel.description && <p className="mt-2 text-sm text-gray-700">{channel.description}</p>}
        </div>
      </div>

      {/* Videos */}
      <h3 className="text-xl font-semibold mb-4">Videos</h3>
      {videos.length === 0 ? (
        <p className="text-gray-500">No videos yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              video={video}
              isOwner={isOwner}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* PIN confirmation modal */}
      <ConfirmPinModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}