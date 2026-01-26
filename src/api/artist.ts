// src/api/artist.ts
import axiosInstance from "./axiosInstance";

/* 인기 아티스트 타입 (HomePage에서 사용) */
export type PopularArtist = {
  rank: number;
  artist_id: number;
  artist_name: string;
  image_small_circle: string;
  play_count: number;
};

// 아티스트 상세 정보
export type ArtistDetail = {
  artist_id: number;
  artist_name: string;
  artist_image: string | null;
};

// 아티스트별 곡 목록
export type ArtistTrack = {
  id: string;
  title: string;
  album: string;
  duration: string;
  album_image: string | null;
};

// 아티스트별 앨범 목록
export type ArtistAlbum = {
  id: string;
  title: string;
  album_image: string | null;
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

export async function fetchPopularArtists(limit = 7): Promise<PopularArtist[]> {
  const res = await axiosInstance.get(`/artists/popular`, {
    params: { limit },
  });
  return unwrapList<PopularArtist>(res.data);
}

export async function fetchArtistDetail(
  artistId: number | string
): Promise<ArtistDetail> {
  const res = await axiosInstance.get(`/artists/${artistId}/`);
  return res.data as ArtistDetail;
}

export async function fetchArtistTracks(
  artistId: number | string
): Promise<ArtistTrack[]> {
  const res = await axiosInstance.get(`/artists/${artistId}/tracks`);
  return unwrapList<ArtistTrack>(res.data);
}

export async function fetchArtistAlbums(
  artistId: number | string
): Promise<ArtistAlbum[]> {
  const res = await axiosInstance.get(`/artists/${artistId}/albums`);
  return unwrapList<ArtistAlbum>(res.data);
}