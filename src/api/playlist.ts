import axiosInstance from "./axiosInstance";

// ==========================================
// Type Definitions (데이터 타입 정의)
// ==========================================

/** 플레이리스트 내 개별 곡 아이템 */
export interface PlaylistItem {
  item_id: number;
  music: {
    music_id: number;
    title: string;
    artist: { name: string };
    album: { title: string; cover_image: string };
    duration?: number; // 필요 시 추가
    [key: string]: any; 
  };
  order: number;
  created_at: string;
}

/** 플레이리스트 요약 정보 (목록 조회용) */
export interface PlaylistSummary {
  playlist_id: number;
  title: string;
  visibility: "public" | "private";
  creator_nickname: string;
  item_count: number;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

/** 플레이리스트 상세 정보 (상세 조회 및 생성/수정 응답용) */
export interface PlaylistDetail extends PlaylistSummary {
  items: PlaylistItem[];
}

// -------------------- Request Types --------------------

/** 플레이리스트 생성 요청 */
export interface CreatePlaylistRequest {
  title: string;
  visibility: "public" | "private";
}

/** 플레이리스트 수정 요청 */
export interface UpdatePlaylistRequest {
  title?: string;
  visibility?: "public" | "private";
}

/** 플레이리스트 목록 조회 필터 */
export interface ListPlaylistsParams {
  visibility?: "public" | "private";
  user_id?: number | string; // 특정 유저의 리스트만 볼 때
}

/** 곡 담기 요청 */
export interface AddPlaylistItemsRequest {
  music_ids: number[];
}

/** 곡 삭제 요청 */
export interface DeletePlaylistItemsRequest {
  item_ids: number[];
}

// -------------------- Response Types --------------------

export interface LikePlaylistResponse {
  message: string;
  playlist_id: number;
  is_liked: boolean;
}

export interface DeletePlaylistItemsResponse {
  message: string;
  deleted_count: number;
}

// ==========================================
// API Functions (API 함수 구현)
// ==========================================

/**
 * 1. 플레이리스트 목록 조회 (List Playlists)
 * GET /api/v1/playlists
 * @param params { visibility, user_id } 
 * - 내 플레이리스트 조회 시: listPlaylists({ user_id: 'me' }) 형태 권장 혹은 백엔드 스펙에 맞춤
 */
export async function listPlaylists(params?: ListPlaylistsParams): Promise<PlaylistSummary[]> {
  const response = await axiosInstance.get<PlaylistSummary[]>("/playlists", { params });
  return response.data;
}

/**
 * 2. 플레이리스트 상세 조회 (Get Playlist Detail)
 * GET /api/v1/playlists/{playlist_id}
 */
export async function getPlaylistDetail(playlistId: number | string): Promise<PlaylistDetail> {
  const response = await axiosInstance.get<PlaylistDetail>(`/playlists/${playlistId}`);
  return response.data;
}

/**
 * 3. 플레이리스트 생성 (Create Playlist)
 * POST /api/v1/playlists
 */
export async function createPlaylist(data: CreatePlaylistRequest): Promise<PlaylistDetail> {
  const response = await axiosInstance.post<PlaylistDetail>("/playlists", data);
  return response.data;
}

/**
 * 4. 플레이리스트 수정 (Update Playlist)
 * PATCH /api/v1/playlists/{playlist_id}
 */
export async function updatePlaylist(
  playlistId: number | string,
  data: UpdatePlaylistRequest
): Promise<PlaylistDetail> {
  const response = await axiosInstance.patch<PlaylistDetail>(`/playlists/${playlistId}`, data);
  return response.data;
}

/**
 * 5. 플레이리스트에 곡 추가 (Add Items)
 * POST /api/v1/playlists/{playlist_id}/items
 */
export async function addPlaylistItems(
  playlistId: number | string,
  musicIds: number[]
): Promise<PlaylistDetail> { 
  // 백엔드 응답이 업데이트된 상세 정보라면 PlaylistDetail, 단순 메시지라면 별도 타입 사용
  const payload: AddPlaylistItemsRequest = { music_ids: musicIds };
  const response = await axiosInstance.post<PlaylistDetail>(`/playlists/${playlistId}/items`, payload);
  return response.data;
}

/**
 * 6. 플레이리스트 내 곡 삭제 (Delete Items)
 * DELETE /api/v1/playlists/{playlist_id}/items
 */
export async function deletePlaylistItems(
  playlistId: number | string,
  itemIds: number[]
): Promise<DeletePlaylistItemsResponse> {
  const response = await axiosInstance.delete<DeletePlaylistItemsResponse>(
    `/playlists/${playlistId}/items`,
    { data: { item_ids: itemIds } as DeletePlaylistItemsRequest }
  );
  return response.data;
}

// ==========================================
// Interaction & Utils (상호작용)
// ==========================================

/**
 * 플레이리스트 좋아요
 * POST /api/v1/playlists/{playlist_id}/likes
 */
export async function likePlaylist(playlistId: number | string): Promise<LikePlaylistResponse> {
  const response = await axiosInstance.post<LikePlaylistResponse>(`/playlists/${playlistId}/likes`);
  return response.data;
}

/**
 * 플레이리스트 좋아요 취소
 * DELETE /api/v1/playlists/{playlist_id}/likes
 */
export async function unlikePlaylist(playlistId: number | string): Promise<LikePlaylistResponse> {
  const response = await axiosInstance.delete<LikePlaylistResponse>(`/playlists/${playlistId}/likes`);
  return response.data;
}

/**
 * (참고) 개별 곡 좋아요
 * POST /api/v1/tracks/{music_id}/likes
 * NOTE: 추후 music.ts 또는 track.ts로 이동을 고려하세요.
 */
export async function likeTrack(musicId: number): Promise<unknown> {
  const response = await axiosInstance.post(`/tracks/${musicId}/likes`);
  return response.data;
}