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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; 
  };
  order: number;
  created_at: string;
}

/** 플레이리스트 요약 정보 (목록 조회용) */
export interface PlaylistSummary {
  playlist_id: number;
  title: string;
  visibility: "public" | "private" | "system";
  user_id: number; // 플레이리스트 소유자 ID
  creator_nickname: string;
  item_count: number;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export const SYSTEM_LIKED_PLAYLIST_TITLE = "나의 좋아요 목록";

/** 
 * 시스템 플레이리스트인지 확인
 * @param title 플레이리스트 제목
 */
export function isSystemPlaylist(title: string): boolean {
  return title === SYSTEM_LIKED_PLAYLIST_TITLE;
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

export interface DeletePlaylistResponse {
  message: string;
  playlist_id: number;
}

export interface DeletePlaylistItemsResponse {
  message: string;
  deleted_count: number;
}

export interface DeletePlaylistItemResponse {
  message: string;
  item_id: number;
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
 * 1-1. 내 플레이리스트 조회 (개인 탭용)
 * GET /playlists?visibility=private
 */
export async function listMyPlaylists(): Promise<PlaylistSummary[]> {
  const response = await axiosInstance.get<PlaylistSummary[]>("/playlists", {
    params: { visibility: "private" }
  });
  return response.data;
}

/**
 * 1-2. 공개 플레이리스트 조회 (홈 화면용)
 * GET /playlists?visibility=public
 */
export async function listPublicPlaylists(): Promise<PlaylistSummary[]> {
  const response = await axiosInstance.get<PlaylistSummary[]>("/playlists", {
    params: { visibility: "public" }
  });
  return response.data;
}

/**
 * 1-3. 좋아요한 플레이리스트 조회 (좋아요 탭용)
 * GET /api/v1/playlists/likes
 */
export async function listLikedPlaylists(): Promise<PlaylistSummary[]> {
  const response = await axiosInstance.get<PlaylistSummary[]>("/playlists/likes");
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
 * 4. 플레이리스트 삭제 (Delete Playlist)
 * DELETE /api/v1/playlists/{playlist_id}
 */
export async function deletePlaylist(playlistId: number | string): Promise<DeletePlaylistResponse> {
  // 백엔드에서 삭제 성공 시 { message: "삭제되었습니다", playlist_id: 123 } 같은 응답을 줍니다.
  const response = await axiosInstance.delete<DeletePlaylistResponse>(`/playlists/${playlistId}`);
  return response.data;
}

/**
 * 5. 플레이리스트 수정 (Update Playlist)
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
 * 6. 플레이리스트에 곡 추가 (Add Items)
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

// 서버가 music_id(단건)만 받는 경우 사용
export async function addPlaylistItem(
  playlistId: number | string,
  musicId: number
): Promise<PlaylistDetail> {
  const payload = { music_id: musicId };
  const response = await axiosInstance.post<PlaylistDetail>(
    `/playlists/${playlistId}/items`,
    payload
  );
  return response.data;
}



/**
 * 7. 플레이리스트 내 곡 삭제 (Delete Items)
 * DELETE /api/v1/playlists/{playlist_id}/items
 */
export async function deletePlaylistItems(
  playlistId: number | string,
  itemIds: number[]
): Promise<DeletePlaylistItemsResponse> {
  const response = await axiosInstance.delete<DeletePlaylistItemsResponse>(
    `/playlists/items/${playlistId}`,
    { data: { item_ids: itemIds } as DeletePlaylistItemsRequest }
  );
  return response.data;
}

/**
 * 7-1. 플레이리스트 내 단일 곡 삭제 (Delete Single Item)
 * DELETE /api/v1/playlists/items/{item_id}
 */
export async function deletePlaylistItem(
  itemId: number | string
): Promise<DeletePlaylistItemResponse> {
  const response = await axiosInstance.delete<DeletePlaylistItemResponse>(
    `/playlists/items/${itemId}`
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

