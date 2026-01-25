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

// Simple in-memory cache
let cachedStations: StationCategory[] | null = null;

export async function fetchDjStations(): Promise<StationCategory[]> {
    // Return cached data if available
    if (cachedStations) {
        return cachedStations;
    }

    try {
        const res = await axiosInstance.get("/tracks/station/curated");
        let data: StationCategory[] = [];

        if (Array.isArray(res.data)) {
            data = res.data as StationCategory[];
        } else if (res.data && Array.isArray(res.data.results)) {
            data = res.data.results as StationCategory[];
        } else {
            // Fallback to mock if format is unexpected
            data = MOCK_STATIONS;
        }

        // Save to cache
        cachedStations = data;
        return data;

    } catch (e) {
        console.warn("Backend not deployed yet, using mock data for DJ Station");
        // Don't cache errors (or maybe cache mock data on error?)
        // For now, let's just return mock but not cache it permanently so retries can happen? 
        // Actually, if backend is down, we probably want to keep trying or just show mock.
        // Let's caching mock data behavior for consistency if we want "instant" load next time too?
        // But user might want real data. Let's NOT cache the error fallback for now, 
        // so it retries on next page visit if it failed. 
        // However, if the issue is "slow load" and it's timing out, we definitely want some fallback usage.
        return MOCK_STATIONS;
    }
}
