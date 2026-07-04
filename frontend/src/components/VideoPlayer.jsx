"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Settings } from "lucide-react";

export default function VideoPlayer({ src, poster, isLive = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.warn('🎬 Video element not ready');
      return;
    }

    // 🟢 Log the src
    console.log('🎬 VideoPlayer received src:', src);
    if (!src) {
      console.error('🎬 src is undefined or empty!');
      return;
    }



    if (Hls.isSupported()) {
      console.log('🎬 Using hls.js');
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        maxLoadingDelay: isLive ? 4 : 10,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      // 🔥 When manifest loads
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('🎬 Manifest parsed:', data);
        const levels = hls.levels.map((level, index) => ({
          index,
          height: level.height,
          bitrate: Math.round(level.bitrate / 1000),
          label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}k`,
        }));
        setQualities(levels);
        video.play().catch(err => console.warn('🎬 Auto-play failed:', err));
      });

      // 🔥 Error handling
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('🎬 hls.js error:', data);
        if (data.fatal) {
          console.error('🎬 Fatal error – attempting recovery...');
          // Optionally reload or fallback
        }
      });

      // 🔥 When quality changes
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setSelectedQuality(data.level);
      });

      // Cleanup
      return () => {
        hls.destroy();
      };
    } else {
      console.warn('🎬 HLS not supported, falling back to MP4');
      video.src = src;
    }
  }, [src, isLive]);

  // ... rest of the component unchanged ...

  // 🎯 Manual quality switch
  const handleQualityChange = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setSelectedQuality(levelIndex);
      setShowQualityMenu(false);
    }
  };

  // Get label for the current quality
  const getCurrentQualityLabel = () => {
    if (selectedQuality === -1) return "Auto";
    const level = qualities.find((q) => q.index === selectedQuality);
    return level ? level.label : "Auto";
  };

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        controls
        poster={poster}
        className="w-full aspect-video"
        playsInline
        autoPlay={true}
      />

      {/* 🔴 Live Badge */}
      {isLive && (
        <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </div>
      )}

      {/* ⚙️ Quality Selector Button */}
      {qualities.length > 0 && (
        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition flex items-center gap-1 text-xs"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">{getCurrentQualityLabel()}</span>
          </button>

          {showQualityMenu && (
            <div className="absolute bottom-12 right-0 bg-black/90 text-white rounded-lg shadow-xl py-1 min-w-[120px]">
              {/* Auto option */}
              <button
                onClick={() => handleQualityChange(-1)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition ${
                  selectedQuality === -1 ? "text-blue-400" : ""
                }`}
              >
                Auto
              </button>

              {/* Quality levels (sorted descending) */}
              {[...qualities]
                .sort((a, b) => b.height - a.height)
                .map((level) => (
                  <button
                    key={level.index}
                    onClick={() => handleQualityChange(level.index)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition ${
                      selectedQuality === level.index ? "text-blue-400" : ""
                    }`}
                  >
                    {level.label} {isLive && "🔴"}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}