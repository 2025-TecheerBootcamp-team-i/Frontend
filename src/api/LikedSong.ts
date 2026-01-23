import axiosInstance from "./axiosInstance";

// 좋아요 호출 GET
export type TrackLikeCountResponse = {
  music_id: number;
  like_count: number;
  is_liked: boolean;
};

// 좋아요 추가 POST
export type LikeToggleResponse = {
  message: string;
  music_id: number;
  is_liked: boolean;
  like_count: number;
};

// 좋아요 삭제 DELETE
export type LikedTrackDelete = {
  message: string;
  music_id: number;
  is_liked: boolean;
  like_count: number;
}

// 나의 좋아요 플리 GET

export type LikedTracksResponse = {
  message: string;
  user_id: number;
  count: number;
  results: LikedTrack[];
};

export type LikedTrack = {
  music_id: number;
  music_name: string;
  album_image: string | null;
  artist_name: string;
  duration: number;
};

// 좋아요 받아오기 | GET /api/v1/tracks/{music_id}/likes
export async function likecount(music_id: number | string): Promise<TrackLikeCountResponse> {
  const res = await axiosInstance.get<TrackLikeCountResponse>(`/tracks/${music_id}/likes`);
  return res.data;
}

// 좋아요 누르기 | POST /api/v1/tracks/{music_id}/likes
export async function likeTrack(music_id: number | string): Promise<LikeToggleResponse> {
  const res = await axiosInstance.post<LikeToggleResponse>(`/tracks/${music_id}/likes`);
  return res.data;
}

// 좋아요 취소하기 | DELETE /api/v1/tracks/{music_id}/likes
export async function deleteTrack(music_id: number | string): Promise<LikedTrackDelete> {
  const res = await axiosInstance.delete<LikedTrackDelete>(`/tracks/${music_id}/like`);
  return res.data;
}

// 유저의 좋아요 목록 가져오기 | GET /api/v1/tracks/{user_id}/likes
export async function fetchLikedTracks(user_id: number | string): Promise<LikedTrack[]> {
  const res = await axiosInstance.get<LikedTracksResponse>(`/users/${user_id}/likes`);
  return res.data.results;
}