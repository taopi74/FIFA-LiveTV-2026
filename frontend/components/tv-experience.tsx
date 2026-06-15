"use client";

import Hls from "hls.js";
import { useRouter } from "next/navigation";
import {
  Compass,
  Expand,
  Heart,
  ListVideo,
  Play,
  Pause,
  Radio,
  Signal,
  Tv,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Channel } from "@/lib/services/playlist-service";

type TvExperienceProps = {
  channels: Channel[];
  initialChannelId?: string;
};

const storage = {
  favorites: "livetv:favorites"
};

function readList(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function TvExperience({ channels, initialChannelId }: TvExperienceProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [activeChannelId, setActiveChannelId] = useState(initialChannelId ?? channels[0]?.id ?? "");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playError, setPlayError] = useState("");
  const [showPlayerChrome, setShowPlayerChrome] = useState(true);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const chromeTimerRef = useRef<number | undefined>(undefined);

  // Sync play/pause state from video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // Sync active channel from URL param changes
  useEffect(() => {
    if (initialChannelId && channels.some(c => c.id === initialChannelId)) {
      setActiveChannelId(initialChannelId);
    }
  }, [initialChannelId, channels]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? channels[0],
    [activeChannelId, channels]
  );

  useEffect(() => {
    setFavorites(readList(storage.favorites));
  }, []);

  // Show controls on mouse move and auto-hide after 3 seconds
  function revealPlayerChrome() {
    setShowPlayerChrome(true);
    if (chromeTimerRef.current) {
      window.clearTimeout(chromeTimerRef.current);
    }
    chromeTimerRef.current = window.setTimeout(() => {
      // Don't auto-hide controls if quick menu is open
      if (!showQuickMenu) {
        setShowPlayerChrome(false);
      }
    }, 3000);
  }

  useEffect(() => {
    revealPlayerChrome();
    return () => {
      if (chromeTimerRef.current) {
        window.clearTimeout(chromeTimerRef.current);
      }
    };
  }, [activeChannelId, showQuickMenu]);

  // Load and play channel HLS stream
  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;

    const video = videoRef.current;
    setPlayError("");
    
    // Destroy previous HLS instance
    hlsRef.current?.destroy();
    hlsRef.current = null;
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        enableWorker: true,
        maxBufferLength: 10
      });

      hlsRef.current = hls;
      hls.loadSource(activeChannel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn("HLS Fatal Error:", data);
          setPlayError("This channel stream is offline or blocked by CORS. Try another channel.");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari fallback
      video.src = activeChannel.url;
      video.play().catch(() => undefined);
    } else {
      setPlayError("Your browser cannot play HLS streams directly.");
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [activeChannel]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  function toggleFavorite(channelId: string) {
    setFavorites((current) => {
      const next = current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [channelId, ...current];
      writeList(storage.favorites, next);
      return next;
    });
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function toggleFullscreen() {
    const player = document.querySelector(".cinematic-player-wrapper");
    if (player instanceof HTMLElement) {
      if (!document.fullscreenElement) {
        player.requestFullscreen?.().catch((err) => console.error(err));
      } else {
        document.exitFullscreen?.();
      }
    }
  }

  if (!activeChannel) {
    return (
      <main className="empty-state">
        <Tv aria-hidden="true" />
        <h1>No channels loaded</h1>
        <p>Ensure the backend server is running and provides channels.</p>
      </main>
    );
  }

  return (
    <div 
      className="cinematic-player-wrapper"
      onMouseMove={revealPlayerChrome}
      onClick={revealPlayerChrome}
      onTouchStart={revealPlayerChrome}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden"
      }}
    >
      {/* HLS Video Player */}
      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          backgroundColor: "#000"
        }}
      />

      {/* Glow Ambient Backdrop */}
      <div className="ambient ambient-one" style={{ filter: "blur(120px)", opacity: 0.3 }} />
      <div className="ambient ambient-two" style={{ filter: "blur(120px)", opacity: 0.3 }} />

      {/* Error Message Panel */}
      {playError ? (
        <div 
          className="player-error" 
          style={{ 
            zIndex: 10, 
            backgroundColor: "rgba(5, 6, 9, 0.85)", 
            backdropFilter: "blur(15px)" 
          }}
        >
          <Signal size={40} className="text-coral" aria-hidden="true" style={{ color: "var(--coral)" }} />
          <h2 style={{ fontSize: "1.5rem", margin: "10px 0" }}>Playback Issue</h2>
          <span>{playError}</span>
          <button 
            onClick={() => setShowQuickMenu(true)} 
            className="group-strip button"
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "var(--lime)",
              color: "#08090d",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Select Another Channel
          </button>
        </div>
      ) : null}

      {/* Floating Header Overlay */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 30px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
          opacity: showPlayerChrome ? 1 : 0,
          transform: showPlayerChrome ? "translateY(0)" : "translateY(-20px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          pointerEvents: showPlayerChrome ? "all" : "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="brand-mark" style={{ width: "36px", height: "36px" }}>
            <Tv size={18} aria-hidden="true" />
          </span>
          <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>LiveTV</span>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => router.push("/browse")}
            className="icon-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "auto",
              padding: "0 18px",
              background: "var(--panel-strong)",
              borderRadius: "8px",
              border: "1px solid var(--line-strong)",
              color: "#fff",
              cursor: "pointer"
            }}
            title="Open Channels Grid Browser"
          >
            <Compass size={18} />
            <span>Browse Channels Grid</span>
          </button>

          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="icon-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "auto",
              padding: "0 18px",
              background: showQuickMenu ? "var(--lime)" : "var(--panel-strong)",
              borderRadius: "8px",
              border: "1px solid var(--line-strong)",
              color: showQuickMenu ? "#08090d" : "#fff",
              cursor: "pointer"
            }}
            title="Toggle Quick Switcher Menu"
          >
            <ListVideo size={18} />
            <span>Quick List</span>
          </button>
        </div>
      </header>

      {/* Floating Footer Overlay (Control Bar) */}
      <footer
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 8,
          padding: "30px",
          background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
          opacity: showPlayerChrome ? 1 : 0,
          transform: showPlayerChrome ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          pointerEvents: showPlayerChrome ? "all" : "none"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Radio size={14} className="animate-pulse" /> Live Now
            </span>
            <h1 style={{ color: "#fff", margin: "6px 0 2px", fontSize: "2rem", fontWeight: 700 }}>
              {activeChannel.name}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.95rem" }}>
              Channel {activeChannel.number.toString().padStart(3, "0")} · {activeChannel.group} · {activeChannel.quality} · {activeChannel.host}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={togglePlay}
              className="icon-button"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer"
              }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            <button
              onClick={() => toggleFavorite(activeChannel.id)}
              className="icon-button"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: favoriteSet.has(activeChannel.id) ? "var(--red)" : "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer"
              }}
              title="Add to Favorites"
            >
              <Heart size={20} fill={favoriteSet.has(activeChannel.id) ? "currentColor" : "none"} />
            </button>

            <button
              onClick={toggleMute}
              className="icon-button"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer"
              }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="icon-button"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer"
              }}
              title="Toggle Fullscreen"
            >
              <Expand size={20} />
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-out Quick Switcher Sidebar Drawer */}
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "360px",
          zIndex: 9,
          background: "rgba(10, 12, 18, 0.94)",
          backdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "-10px 0 40px rgba(0,0,0,0.5)",
          transform: showQuickMenu ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: "20px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <ListVideo size={20} /> Quick Channels
          </h2>
          <button
            onClick={() => setShowQuickMenu(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable list of channels */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px" }}>
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                setActiveChannelId(channel.id);
                // Update URL parameter without full refresh
                window.history.pushState({}, "", `/?channel=${channel.id}`);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "10px 14px",
                background: channel.id === activeChannel.id ? "rgba(213, 255, 95, 0.15)" : "rgba(255,255,255,0.04)",
                border: channel.id === activeChannel.id ? "1px solid rgba(213, 255, 95, 0.5)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                textAlign: "left",
                color: channel.id === activeChannel.id ? "var(--lime)" : "#fff",
                cursor: "pointer",
                transition: "background 0.2s, border-color 0.2s"
              }}
            >
              <div 
                style={{ 
                  width: "12px", 
                  height: "12px", 
                  borderRadius: "50%", 
                  backgroundColor: channel.id === activeChannel.id ? "var(--lime)" : "rgba(255,255,255,0.25)",
                  flexShrink: 0
                }} 
              />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{channel.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{channel.group}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
