import axiosInstance from "./axiosInstance";

export interface RecommendedMusic {
    music_id: number;
    music_name: string;
    artist?: {
        artist_id: number;
        artist_name: string;
        artist_image?: string | null;
    };
    album?: {
        album_id: number;
        album_name: string;
        album_image?: string | null;
    };
    artist_name?: string; // Fallback or flat structure support
    album_image?: string | null; // Fallback or flat structure support
    image_square?: string | null;
    image_large_square?: string | null;
}

/**
 * 음악 추천 (태그, 장르, 감정 기반)
 * GET /api/v1/recommendations/
 * @param musicId - 기준이 되는 음악 ID
 * @param limit - 추천 받을 곡 수 (default: 10)
 */
export async function getRecommendations(musicId: number, limit: number = 4): Promise<RecommendedMusic[]> {
    try {
        const res = await axiosInstance.get<any>("/recommendations/", {
            params: {
                music_id: musicId,
                limit,
            },
        });

        // Debugging log to inspect the actual response structure
        console.log("[API] getRecommendations response:", res.data);

        if (Array.isArray(res.data)) {
            return res.data;
        } else if (res.data && Array.isArray(res.data.results)) {
            return res.data.results;
        } else if (res.data && Array.isArray(res.data.data)) {
            return res.data.data;
        }

        console.warn("[API] Unexpected recommendation response format:", res.data);
        return [];
    } catch (error) {
        console.error("[API] getRecommendations failed:", error);
        return [];
    }
}
