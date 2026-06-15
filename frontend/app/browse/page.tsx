import { ChannelBrowser } from "@/components/channel-browser";
import { PlaylistService } from "@/lib/services/playlist-service";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const channels = await PlaylistService.getPlaylist();

  return <ChannelBrowser channels={channels} />;
}
