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

export type StationSection = {
    theme: string;
    station_data: StationCategory[];
};

const MOCK_STATIONS: StationSection[] = [
    {
        theme: "느낌 별 스테이션",
        station_data: [
            { category: "신나는 노래", keyword: "신나는", tracks: [] },
            { category: "우울할 때", keyword: "우울", tracks: [] },
            { category: "달달한 노래", keyword: "달달", tracks: [] },
            { category: "운전할 때", keyword: "운전", tracks: [] },
            { category: "운동할 때", keyword: "운동", tracks: [] },
            { category: "집중 할때", keyword: "집중", tracks: [] },
            { category: "이별 노래", keyword: "이별", tracks: [] },
            { category: "잠 안 올때", keyword: "잠", tracks: [] },
        ]
    },
    {
        theme: "장르 별 스테이션",
        station_data: [
            { category: "요즘 k-pop", keyword: "k-pop", tracks: [] },
            { category: "요즘 pop", keyword: "pop", tracks: [] },
            { category: "슬픈 발라드", keyword: "발라드", tracks: [] },
            { category: "편안한 알앤비", keyword: "r&b", tracks: [] },
            { category: "요즘 국힙", keyword: "국힙", tracks: [] },
            { category: "요즘 외힙", keyword: "외힙", tracks: [] },
            { category: "잔잔한 클래식", keyword: "클래식", tracks: [] },
            { category: "EDM", keyword: "edm", tracks: [] },
        ]
    }
];

/**
 * DJ Station curated list fetching
 * Endpoint: /tracks/station/curated
 */

// Simple in-memory cache
let cachedStations: StationSection[] | null = null;

export async function fetchDjStations(): Promise<StationSection[]> {
    // Return cached data if available
    if (cachedStations) {
        return cachedStations;
    }

    try {
        const res = await axiosInstance.get("/tracks/station/curated");
        let data: StationSection[] = [];

        if (Array.isArray(res.data)) {
            // New structure: Array of objects with { theme, station_data }
            const firstItem = res.data[0];
            if (firstItem && typeof firstItem === 'object' && 'station_data' in firstItem) {
                // Correct structure
                data = res.data as StationSection[];
            }
            // Previous assumption of 2D array (keeping for safety if mixed)
            else if (Array.isArray(firstItem)) {
                data = [{ theme: "느낌 별 스테이션", station_data: firstItem as StationCategory[] }];
            }
            else {
                // Flat array (Legacy)
                data = [{ theme: "느낌 별 스테이션", station_data: res.data as StationCategory[] }];
            }
        } else if (res.data && Array.isArray(res.data.results)) {
            data = [{ theme: "느낌 별 스테이션", station_data: res.data.results as StationCategory[] }];
        } else {
            // Fallback to mock if format is unexpected
            data = MOCK_STATIONS;
        }

        // Save to cache
        cachedStations = data;
        return data;

    } catch (e) {
        console.warn("Backend not deployed yet, using mock data for DJ Station");
        return MOCK_STATIONS;
    }
}
