"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import VideoPlayer from "@/components/VideoPlayer";
import LiveChat from "@/components/LiveChat";

export default function LiveStreamPage() {
  const { streamId } = useParams();
  const [stream, setStream] = useState(null);

  useEffect(() => {
    api.get(`/live/${streamId}`).then(res => setStream(res.data.stream));
  }, [streamId]);

  if (!stream) return <div>Loading...</div>;

  const hlsUrl = `http://localhost:8080/hls/${stream.streamKey}/index.m3u8`; // adjust to your RTMP server

  return (
    <div className="flex h-screen">
      <div className="flex-1 bg-black">
        <VideoPlayer src={hlsUrl} isLive={true} />
        <div className="p-4">
          <h1 className="text-xl font-bold">{stream.title}</h1>
          <p>{stream.description}</p>
        </div>
      </div>
      <div className="w-80">
        <LiveChat streamId={streamId} />
      </div>
    </div>
  );
}