export type Channel = {
  id: string;
  number: number;
  name: string;
  url: string;
  group: string;
  country?: string;
  quality?: string;
  logo?: string;
  host: string;
};

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class PlaylistService {
  /**
   * Fetches channels from the backend Express server
   */
  public static async getPlaylist(forceRefresh = false): Promise<Channel[]> {
    try {
      const url = `${BACKEND_API_URL}/api/channels${forceRefresh ? "?refresh=true" : ""}`;
      const response = await fetch(url, {
        next: { revalidate: 300 } // Cache in Next.js data cache for 5 minutes
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch channels from backend: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error loading channels from backend:", error);
      return [];
    }
  }
}
