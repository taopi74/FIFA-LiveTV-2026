"use client";

import Hls from "hls.js";
import {
  Compass,
  Expand,
  Heart,
  ListVideo,
  Minimize,
  Play,
  Pause,
  Radio,
  Search,
  Signal,
  Tv,
  Volume2,
  VolumeX
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

function channelInitials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "TV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function accentIndex(value: string) {
  let sum = 0;
  for (const char of value) {
    sum += char.charCodeAt(0);
  }
  return (sum % 6) + 1;
}

// Dummy show schedule generator to make EPG look authentic
function getEPGInfo(channelName: string, index: number) {
  const shows = [
    "Premier League Live: MUN vs MCI",
    "UCL Matchday Coverage",
    "F1 Grand Prix Practice",
    "World Sports Center",
    "La Liga Highlights",
    "Liga MX Clausura Live",
    "NBA Daily: Lakers vs Celtics",
    "Global News Hourly",
    "Sports Tonight Live",
    "Extreme Sports Showcase"
  ];
  
  const showName = shows[index % shows.length];
  
  // Progress percentage (35% to 85% for live effect)
  const progress = 35 + ((index * 17) % 51);
  
  return {
    showName,
    timeSlot: "21:00 - 23:00",
    progress
  };
}

export function TvExperience({ channels, initialChannelId }: TvExperienceProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [activeChannelId, setActiveChannelId] = useState(initialChannelId ?? channels[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlayerChrome, setShowPlayerChrome] = useState(true);
  const [playError, setPlayError] = useState("");
  const [clock, setClock] = useState({ time: "21:34", date: "Wed Oct 25" });

  // Update clock state dynamically
  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const time = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      const date = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      setClock({ time, date });
    }
    
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync active channel from initialChannelId param changes
  useEffect(() => {
    if (initialChannelId && channels.some((c) => c.id === initialChannelId)) {
      setActiveChannelId(initialChannelId);
    }
  }, [initialChannelId, channels]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls chrome in theater/fullscreen mode
  useEffect(() => {
    if (!isTheaterMode && !isFullscreen) {
      setShowPlayerChrome(true);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowPlayerChrome(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowPlayerChrome(false);
      }, 3000);
    };

    setShowPlayerChrome(true);
    timeoutId = setTimeout(() => {
      setShowPlayerChrome(false);
    }, 3000);

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isTheaterMode, isFullscreen]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? channels[0],
    [activeChannelId, channels]
  );

  useEffect(() => {
    setFavorites(readList(storage.favorites));
  }, []);

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

  // HLS stream playback logic
  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;

    const video = videoRef.current;
    setPlayError("");
    
    hlsRef.current?.destroy();
    hlsRef.current = null;
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        enableWorker: true
      });

      hlsRef.current = hls;
      hls.loadSource(activeChannel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setPlayError("This stream did not respond. Try selecting another channel from the sidebar.");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
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

  // Filter channels based on search query in the header
  const filteredChannels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.country && c.country.toLowerCase().includes(q))
    );
  }, [channels, searchQuery]);

  // Generate EPG Info for the active channel
  const activeEPG = useMemo(() => {
    if (!activeChannel) return { showName: "", timeSlot: "", progress: 0 };
    const index = channels.findIndex((c) => c.id === activeChannel.id);
    return getEPGInfo(activeChannel.name, index === -1 ? 0 : index);
  }, [activeChannel, channels]);

  // Recommendations: select 3 other channels from the list
  const recommendedChannels = useMemo(() => {
    const index = channels.findIndex((c) => c.id === activeChannelId);
    const result: { channel: Channel; thumb: string; showTitle: string; time: string }[] = [];
    
    const sportsThumbs = [
      "https://placehold.co/450x250/08090d/52e0d6?text=Upcoming+Match", 
      "https://placehold.co/450x250/08090d/d5ff5f?text=Live+Coverage", 
      "https://placehold.co/450x250/08090d/52e0d6?text=Sports+Center", 
      "https://placehold.co/450x250/08090d/d5ff5f?text=Championship"
    ];

    for (let offset = 1; offset <= 3; offset++) {
      const targetIndex = (index + offset) % channels.length;
      const ch = channels[targetIndex];
      if (ch) {
        result.push({
          channel: ch,
          thumb: sportsThumbs[(targetIndex) % sportsThumbs.length],
          showTitle: getEPGInfo(ch.name, targetIndex).showName,
          time: getEPGInfo(ch.name, targetIndex).timeSlot
        });
      }
    }
    return result;
  }, [channels, activeChannelId]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function toggleFullscreen() {
    const player = document.querySelector(".neon-player-outer");
    if (player instanceof HTMLElement) {
      if (!document.fullscreenElement) {
        player.requestFullscreen?.().catch(() => undefined);
      } else {
        document.exitFullscreen?.();
      }
    }
  }

  function toggleFavorite(channelId: string) {
    setFavorites((current) => {
      const next = current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [channelId, ...current];
      writeList(storage.favorites, next);
      return next;
    });
  }

  return (
    <div className={`dashboard-container ${isTheaterMode ? "theater-mode" : ""} ${showPlayerChrome ? "is-chrome-visible" : ""}`}>
      {/* 1. Header Bar */}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => setSearchQuery("")}>
            <span className="brand-mark">
              <Tv size={22} style={{ color: "var(--cyan)" }} />
            </span>
            <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fff", letterSpacing: "1px" }}>LiveTV</span>
          </div>
          
          <nav className="dashboard-nav-links">
            <a href="#" className="dashboard-nav-link active">Watch TV</a>
            <a href="#" className="dashboard-nav-link">Guide</a>
            <a href="#" className="dashboard-nav-link">Sports</a>
            <a href="#" className="dashboard-nav-link">Movies</a>
          </nav>
        </div>

        {/* Header Search Box */}
        <div className="dashboard-search-container">
          <Search size={17} className="dashboard-search-icon" />
          <input
            className="dashboard-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, groups, regions..."
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "15px",
                top: "10px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)"
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* User Profile & Clock */}
        <div className="dashboard-profile-box">
          <img 
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" 
            alt="Mona K." 
            className="dashboard-avatar" 
          />
          <span className="dashboard-user-name">Mona K.</span>
          <div className="dashboard-clock">
            <strong>{clock.time}</strong>
            <span>{clock.date}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Body Content (Split Layout) */}
      <div className="dashboard-main-content">
        {/* Left Sidebar: EPG Card List */}
        <aside className="dashboard-sidebar">
          <div className="epg-scroll-container">
            {filteredChannels.map((channel, i) => {
              const epg = getEPGInfo(channel.name, i);
              const isActive = channel.id === activeChannel.id;
              
              return (
                <div
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`epg-card-item ${isActive ? "active" : ""}`}
                >
                  <div className="epg-card-header">
                    <div className="epg-card-logo-container">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" className="epg-card-logo" />
                      ) : (
                        <span className={`epg-card-logo-placeholder accent-${accentIndex(channel.name)}`}>
                          {channelInitials(channel.name)}
                        </span>
                      )}
                      <span className="epg-card-name">{channel.name}</span>
                    </div>
                    <span className="epg-card-live-badge">Live</span>
                  </div>

                  <p className="epg-card-title">{epg.showName}</p>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span className="epg-card-time">{epg.timeSlot}</span>
                    <span className="epg-card-time" style={{ color: "var(--cyan)", fontWeight: 700 }}>{epg.progress}%</span>
                  </div>

                  {/* Progress Line */}
                  <div className="epg-card-progress-bar">
                    <div className="epg-card-progress-fill" style={{ width: `${epg.progress}%` }} />
                  </div>
                </div>
              );
            })}

            {filteredChannels.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--muted)", paddingTop: "40px" }}>
                <Search size={36} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No matching channels found.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Area: Player & Recommendations */}
        <main className="dashboard-viewer">
          {/* Active Channel Metadata Row */}
          <div className="active-channel-meta-row">
            <div className="active-channel-meta-text">
              <h1>{activeChannel.name} - {activeEPG.showName}</h1>
              <p>
                Channel {activeChannel.number.toString().padStart(3, "0")} · {activeChannel.group} · {activeChannel.quality} · {activeChannel.host}
              </p>
            </div>

            <div className="active-channel-badge-logo">
              {activeChannel.logo ? (
                <img src={activeChannel.logo} alt="" className="active-channel-large-logo" />
              ) : (
                <span 
                  className={`epg-card-logo-placeholder accent-${accentIndex(activeChannel.name)}`}
                  style={{ width: "42px", height: "42px", fontSize: "1rem" }}
                >
                  {channelInitials(activeChannel.name)}
                </span>
              )}
              <span className="eyebrow" style={{ color: "var(--cyan)", fontSize: "0.7rem" }}>LIVE</span>
            </div>
          </div>

          {/* Neon Player */}
          <div className={`neon-player-outer ${showPlayerChrome ? "is-chrome-visible" : ""}`}>
            <div className="neon-player-video-box" onDoubleClick={toggleFullscreen}>
              <video ref={videoRef} muted={isMuted} playsInline onClick={togglePlay} style={{ cursor: "pointer" }} />
              
              {/* Playback Error overlay inside player */}
              {playError && (
                <div className="player-error">
                  <Signal size={32} style={{ color: "var(--coral)" }} />
                  <span style={{ maxWidth: "80%", fontSize: "0.95rem" }}>{playError}</span>
                </div>
              )}
            </div>

            {/* Custom Interactive Control Bar inside Player */}
            <div 
              className="neon-player-controls"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                background: "rgba(10, 12, 18, 0.95)",
                borderTop: "1px solid var(--glass-border)"
              }}
            >
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <button
                  onClick={togglePlay}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff" }}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>

                <button
                  onClick={toggleMute}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff" }}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", marginLeft: "4px" }}>
                  Active Stream Connected
                </span>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <button
                  onClick={() => toggleFavorite(activeChannel.id)}
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    cursor: "pointer", 
                    color: favoriteSet.has(activeChannel.id) ? "var(--red)" : "#fff" 
                  }}
                  title="Toggle Favorite"
                >
                  <Heart size={20} fill={favoriteSet.has(activeChannel.id) ? "currentColor" : "none"} />
                </button>

                <button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    cursor: "pointer", 
                    color: isTheaterMode ? "var(--lime)" : "#fff" 
                  }}
                  title={isTheaterMode ? "Exit Full View" : "Enter Full View"}
                >
                  <Tv size={20} style={{ color: isTheaterMode ? "var(--lime)" : "#fff" }} />
                </button>

                <button
                  onClick={toggleFullscreen}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff" }}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize size={20} /> : <Expand size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Recommendations Row */}
          <section className="recommendations-section">
            <h2 className="recommendations-title">Recommendations</h2>
            <div className="recommendations-grid">
              {recommendedChannels.map(({ channel, thumb, showTitle, time }) => (
                <div 
                  key={channel.id} 
                  className="recommendation-card"
                  onClick={() => {
                    setActiveChannelId(channel.id);
                    window.history.pushState({}, "", `/?channel=${channel.id}`);
                  }}
                >
                  <div className="recommendation-thumb-box">
                    <img src={thumb} alt="" className="recommendation-thumb-img" />
                    <div className="recommendation-thumb-overlay">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" className="recommendation-logo" />
                      ) : (
                        <span 
                          className={`mini-mark accent-${accentIndex(channel.name)}`}
                          style={{ color: "#08090d", fontWeight: 900, border: "none" }}
                        >
                          {channelInitials(channel.name)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="recommendation-info-box">
                    <h3 className="recommendation-show-title">{channel.name} - {showTitle}</h3>
                    <span className="recommendation-show-time">{time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// Simple X icon helper since lucide-react X import was removed or fallback is needed
function X({ size, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size ?? 24} 
      height={size ?? 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={style}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
