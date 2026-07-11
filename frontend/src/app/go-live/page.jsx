"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function GoLivePage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const isLoggedIn = !!token;
const [streamData, setStreamData] = useState(null);
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
     const { data } = await api.post("/live/start", { title, description, visibility });
setStreamData(data.stream);
      // Redirect to the live stream page
     // router.push(`/live/${data.stream._id}`);
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
{streamData && (
  <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
    <h2 className="text-xl font-bold mb-4">Stream Ready!</h2>

    {/* Stream Key */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Stream Key
      </label>
      <div className="flex items-center gap-2">
        <code className="bg-gray-200 px-3 py-2 rounded text-sm flex-1 break-all">
          {streamData.streamKey}
        </code>
        <button
          onClick={() => navigator.clipboard.writeText(streamData.streamKey)}
          className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
        >
          Copy
        </button>
      </div>
    </div>

    {/* RTMP Server */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        RTMP Server
      </label>
      <div className="flex items-center gap-2">
        <code className="bg-gray-200 px-3 py-2 rounded text-sm flex-1">
         rtmp://localhost/live
        </code>
        <button
          onClick={() => navigator.clipboard.writeText("rtmp://localhost/live")}
          className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
        >
          Copy
        </button>
      </div>
    </div>

    {/* OBS Instructions */}
    <div className="mt-6 p-4 bg-white rounded-lg border">
      <h3 className="font-semibold mb-2">How to start streaming with OBS</h3>
      <ol className="list-decimal list-inside text-sm space-y-1">
        <li>Open <strong>OBS Studio</strong></li>
        <li>Go to <strong>Settings → Stream</strong></li>
        <li>Select <strong>Custom...</strong> as the service</li>
        <li>Paste the <strong>RTMP Server</strong> URL above into <em>Server</em></li>
        <li>Paste the <strong>Stream Key</strong> above into <em>Stream Key</em></li>
        <li>Click <strong>OK</strong> and then <strong>Start Streaming</strong></li>
      </ol>
    </div>

    {/* Go to Live Dashboard button */}
    <button
      onClick={() => router.push(`/live/${streamData._id}`)}
      className="mt-6 w-full bg-red-600 text-white py-3 rounded-full font-semibold hover:bg-red-700 transition"
    >
      Go to Live Dashboard
    </button>
  </div>
)}
    </div>
  </div>
);
}