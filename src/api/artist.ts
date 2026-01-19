// src/api/artist.ts
import axiosInstance from "./axiosInstance";

/** ✅ 인기 아티스트 타입 (HomePage에서 사용) */
export type PopularArtist = {
  rank: number;
  artist_id: number;
  artist_name: string;
  image_small_circle: string;
  play_count: number;
};

/** DRF pagination( {results: []} )도, 그냥 배열([])도 둘 다 처리 */
function unwrapList<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

/**
 아래 endpoint
 **/

// 인기 아티스트 목록
export async function fetchPopularArtists(limit = 7): Promise<PopularArtist[]> {
  const res = await axiosInstance.get(`/api/v1/artists/popular`, {
    params: { limit },
  });
  return unwrapList<PopularArtist>(res.data);
}