"use client";

import { useRouter } from "next/navigation";
import {
  Clock3,
  Compass,
  History,
  ListVideo,
  Play,
  Search,
  Sparkles,
  Star,
  Tv,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Channel } from "@/lib/services/playlist-service";

type ChannelBrowserProps = {
  channels: Channel[];
};

const MAX_RECENTS = 12;

const storage = {
  favorites: "livetv:favorites",
  recents: "livetv:recents"
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

export function ChannelBrowser({ channels }: ChannelBrowserProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const [view, setView] = useState<"browse" | "guide">("browse");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readList(storage.favorites));
    setRecents(readList(storage.recents));
  }, []);

  const groups = useMemo(() => {
    const counts = channels.reduce<Record<string, number>>((result, channel) => {
      result[channel.group] = (result[channel.group] ?? 0) + 1;
      return result;
    }, {});

    return [
      ["All", channels.length] as const,
      ["Favorites", favorites.length] as const,
      ...Object.entries(counts).sort((first, second) => second[1] - first[1])
    ];
  }, [channels, favorites.length]);

  const recentChannels = useMemo(
    () =>
      recents
        .map((id) => channels.find((channel) => channel.id === id))
        .filter((channel): channel is Channel => Boolean(channel)),
    [channels, recents]
  );

  const filteredChannels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return channels.filter((channel) => {
      const matchesGroup =
        activeGroup === "All" ||
        (activeGroup === "Favorites" && favorites.includes(channel.id)) ||
        channel.group === activeGroup;
      const matchesQuery =
        !normalizedQuery ||
        [channel.name, channel.group, channel.country, channel.host]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));

      return matchesGroup && matchesQuery;
    });
  }, [activeGroup, channels, favorites, query]);

  function selectChannel(channel: Channel) {
    // Navigate back to the home page with the channel as a query parameter
    router.push(`/?channel=${channel.id}`);
  }

  function toggleFavorite(channelId: string, event: React.MouseEvent) {
    event.stopPropagation();
    setFavorites((current) => {
      const next = current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [channelId, ...current];
      writeList(storage.favorites, next);
      return next;
    });
  }

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  return (
    <main className="app-shell">
      <div className="topbar">
        <div className="brand" onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
          <span className="brand-mark">
            <Tv size={22} aria-hidden="true" />
          </span>
          <span>LiveTV Browser</span>
        </div>
        <div className="topbar-meta">
          <button 
            onClick={() => router.push("/")}
            className="group-strip button selected"
            style={{ 
              background: "var(--lime)", 
              color: "#08090d",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer"
            }}
          >
            ← Back to Player
          </button>
          <span>{channels.length} channels loaded</span>
        </div>
      </div>

      <section className="control-surface" style={{ marginTop: 0 }}>
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search channels, regions, hosts..."
              aria-label="Search channels"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear">
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="segmented" aria-label="View mode">
            <button
              type="button"
              className={view === "browse" ? "selected" : ""}
              onClick={() => setView("browse")}
            >
              <ListVideo size={16} aria-hidden="true" />
              Browse
            </button>
            <button
              type="button"
              className={view === "guide" ? "selected" : ""}
              onClick={() => setView("guide")}
            >
              <Compass size={16} aria-hidden="true" />
              Guide
            </button>
          </div>
        </div>

        <div className="group-strip" aria-label="Channel groups">
          {groups.map(([group, count]) => (
            <button
              key={group}
              type="button"
              className={activeGroup === group ? "selected" : ""}
              onClick={() => setActiveGroup(group)}
            >
              <span>{group}</span>
              <b>{count}</b>
            </button>
          ))}
        </div>

        {recentChannels.length > 0 ? (
          <section className="rail" aria-label="Recently watched">
            <div className="section-heading">
              <History size={17} aria-hidden="true" />
              <h2>Recently watched</h2>
            </div>
            <div className="mini-channel-row">
              {recentChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  className="mini-channel"
                  onClick={() => selectChannel(channel)}
                >
                  <span className={`mini-mark accent-${accentIndex(channel.name)}`}>
                    {channelInitials(channel.name)}
                  </span>
                  <span>{channel.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {view === "browse" ? (
          <section className="channel-grid" aria-label="Channels">
            {filteredChannels.map((channel) => (
              <article key={channel.id} className="channel-card">
                <button type="button" className="channel-main" onClick={() => selectChannel(channel)}>
                  <span className={`channel-mark small accent-${accentIndex(channel.name)}`}>
                    {channel.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={channel.logo} alt="" />
                    ) : (
                      <span>{channelInitials(channel.name)}</span>
                    )}
                  </span>
                  <span className="channel-copy">
                    <strong>{channel.name}</strong>
                    <span>
                      {channel.group} · {channel.quality}
                    </span>
                  </span>
                  <span className="play-dot">
                    <Play size={15} fill="currentColor" aria-hidden="true" />
                  </span>
                </button>
                <button
                  type="button"
                  className={favoriteSet.has(channel.id) ? "favorite-button active" : "favorite-button"}
                  onClick={(e) => toggleFavorite(channel.id, e)}
                  aria-label={`Favorite ${channel.name}`}
                  title="Favorite"
                >
                  <Star size={17} fill="currentColor" aria-hidden="true" />
                </button>
              </article>
            ))}
          </section>
        ) : (
          <section className="guide-table" aria-label="Live guide">
            {filteredChannels.map((channel, index) => (
              <button
                key={channel.id}
                type="button"
                className="guide-row"
                onClick={() => selectChannel(channel)}
              >
                <span className="guide-number">{channel.number.toString().padStart(3, "0")}</span>
                <span className={`mini-mark accent-${accentIndex(channel.name)}`}>
                  {channelInitials(channel.name)}
                </span>
                <span className="guide-name">{channel.name}</span>
                <span className="guide-program">
                  <Clock3 size={15} aria-hidden="true" />
                  Live coverage block {((index % 4) + 1).toString()}
                </span>
                <span className="guide-spark">
                  <Sparkles size={15} aria-hidden="true" />
                  {channel.quality}
                </span>
              </button>
            ))}
          </section>
        )}

        {filteredChannels.length === 0 ? (
          <div className="no-results">
            <Search size={30} aria-hidden="true" />
            <h2>No matching channels</h2>
            <p>Try a different search or group.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
