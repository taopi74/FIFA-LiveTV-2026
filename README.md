# 📺 LiveTV 2026 - Premium IPTV Streaming Live TV

LiveTV 2026 is a premium, high-performance web application built using **Next.js 15**, **React 19**, and **TypeScript**. It reads M3U streams, parses channel information, and plays HLS streams directly in your browser with optimized buffering and a modern UI.

![Live TV App Interface](https://files.catbox.moe/w5tpde.png)

---

## 🚀 Key Features

* **High Performance Parsing:** Parses complex M3U playlist files, mapping channels, logos, categories, and resolution qualities dynamically.
* **Backend Caching:** Employs an in-memory cache system with a 5-minute Time-To-Live (TTL) to avoid repeating expensive file operations.
* **REST API:** Exposes a clean, CORS-enabled REST API at `/api/channels` which allows external clients (such as Chrome Extensions or VLC wrappers) to easily fetch the channel list.
* **Advanced EPG & Grid Views:** Switch seamlessly between Grid Card view and Guide list view.
* **Client-side State Persistence:** Remembers your favorite and recently watched channels in LocalStorage.

---

## 🛠️ Technology Stack & Architecture

This project has been separated into clean Frontend and Backend concerns within the Next.js framework:

### 1. Backend Layer (Services & API)
* **Service:** [lib/services/playlist-service.ts](./lib/services/playlist-service.ts) manages M3U reading, parsing, and caching.
* **API Route:** [app/api/channels/route.ts](./app/api/channels/route.ts) provides a HTTP endpoint (`/api/channels`) with CORS headers (`Access-Control-Allow-Origin: *`) and optional search/group filtering.

### 2. Frontend Layer (UI & Streaming)
* **Server Component:** [app/page.tsx](./app/page.tsx) renders the root layout server-side for maximum speed.
* **Interactive Player:** [components/tv-experience.tsx](./components/tv-experience.tsx) uses `hls.js` for low-latency live streaming, state management, and modern CSS glassmorphic aesthetics.

---

## 💻 How to Get Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v20+ recommended).

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 Exposing the REST API

The API endpoint is fully decoupled. You can access it locally:
- **Get all channels:** `GET /api/channels`
- **Filter by category:** `GET /api/channels?group=Sports`
- **Search channels:** `GET /api/channels?query=espn`

#### Example Chrome Extension Fetch
```javascript
fetch("http://localhost:3000/api/channels")
  .then((res) => res.json())
  .then((channels) => console.log("Loaded channels:", channels));
```
