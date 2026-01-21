// 곡 검색했을 때 담기와 좋아요 API

import axiosInstance from "./axiosInstance";

//담기 모달(플레이리스트) 요청 GET
export type PlaylistSummary = {
  id: string;
  title: string;
  owner: string;
  isPublic: boolean;
};

// 플레이리스트 담기 요청 POST
export type AddPlaylistItemsBody = {
  music_ids: number[];
};

//  내 플레이리스트 목록(담기 모달용)
export async function fetchMyPlaylists(): Promise<PlaylistSummary[]> {
  const res = await axiosInstance.get<PlaylistSummary[]>("/playlists");
  return res.data;
}

// 플레이리스트에 곡 담기
// POST /api/v1/music/playlists/{playlist_id}/items
export async function addPlaylistItems(
  playlistId: string,
  musicIds: number[]
): Promise<unknown> {
  const payload: AddPlaylistItemsBody = { music_ids: musicIds };
  const res = await axiosInstance.post(`/playlists/${playlistId}/items`, payload);
  return res.data;
}

export async function likeTrack(musicId: number): Promise<unknown> {
  const res = await axiosInstance.post(`/tracks/${musicId}/likes`);
  return res.data;
}
