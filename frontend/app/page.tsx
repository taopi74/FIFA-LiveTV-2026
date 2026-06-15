import { TvExperience } from "@/components/tv-experience";
import { PlaylistService } from "@/lib/services/playlist-service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const channels = await PlaylistService.getPlaylist();

  return <TvExperience channels={channels} initialChannelId={params.channel} />;
}
