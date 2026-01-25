import axiosInstance from "./axiosInstance";

export type StationTrack = {
    music_id: number;
    music_name: string;
    artist: string; // Changed from artist_name to match backend
    album_image: string | null;
    likes: number; // Added likes
    duration?: number; // Optional, as it wasn't in the provided JSON sample but might be useful if available
};

export type StationCategory = {
    category: string;
    keyword: string; // Added keyword
    tracks: StationTrack[];
};

const MOCK_STATIONS: StationCategory[] = [
    { category: "신나는 노래", keyword: "신나는", tracks: [] },
    { category: "우울할 때", keyword: "우울", tracks: [] },
    { category: "달달한 노래", keyword: "달달", tracks: [] },
    { category: "운전할 때", keyword: "운전", tracks: [] },
    { category: "운동할 때", keyword: "운동", tracks: [] },
    { category: "집중 할때", keyword: "집중", tracks: [] },
    { category: "이별 노래", keyword: "이별", tracks: [] },
    { category: "잠 안 올때", keyword: "잠", tracks: [] },
];

/**
 * DJ Station curated list fetching
 * Endpoint: /tracks/station/curated
 */
export async function fetchDjStations(): Promise<StationCategory[]> {
    try {
        const res = await axiosInstance.get("/tracks/station/curated");
        if (Array.isArray(res.data)) return res.data as StationCategory[];
        if (res.data && Array.isArray(res.data.results)) return res.data.results as StationCategory[];
        return MOCK_STATIONS; // Fallback to mock if format is unexpected
    } catch (e) {
        console.warn("Backend not deployed yet, using mock data for DJ Station");
        return MOCK_STATIONS;
    }
}
