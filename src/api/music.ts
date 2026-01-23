// src/api/music.ts
import axiosInstance from "./axiosInstance";

/**
 * 음악 재생 로그 기록
 * POST /tracks/{musicId}/play
 */
export async function logPlayTrack(musicId: number): Promise<void> {
  try {
    console.log('📡 API 호출 시작:', `POST /tracks/${musicId}/play`);
    const response = await axiosInstance.post(`/tracks/${musicId}/play`);
    console.log('✅ API 호출 성공:', response.status, response.data);
  } catch (error) {
    console.error("[API] Failed to log play track:", error);
    console.error("상세 에러:", {
      musicId,
      error: error instanceof Error ? error.message : error,
    });
    // 로그 기록 실패는 재생을 방해하지 않도록 에러를 삼킴
  }
}

/**
 * 음악 오디오 URL 가져오기
 * GET /tracks/{musicId}/play
 */
export async function fetchAudioUrl(musicId: number): Promise<string> {
  const res = await axiosInstance.get<{ audio_url: string }>(
    `/tracks/${musicId}/play`
  );
  return res.data.audio_url;
}

/**
 * 모든 사용자의 AI 음악 목록 조회
 * GET /api/v1/?is_ai=true
 * 
 * @param options - 필터링 옵션
 * @returns AI 음악 목록
 */
export interface ListMusicOptions {
  is_ai?: boolean; // true면 AI 음악만, false면 일반 음악만, undefined면 전체
  user_id?: number; // 특정 사용자 ID로 필터링 (없으면 모든 사용자)
}

export interface MusicListItem {
  music_id: number;
  music_name: string;
  audio_url: string | null;
  is_ai: boolean;
  genre: string | null;
  duration: number | null;
  lyrics: string | null;
  valence: number | null;
  arousal: number | null;
  artist_name: string | null;
  album_name: string | null;
  album_id: number | null;
  album_image: string | null;
  album_image_square: string | null;
  created_at: string;
}

export async function listAllAiMusic(options?: ListMusicOptions): Promise<MusicListItem[]> {
  const params: Record<string, string> = {};
  
  if (options?.is_ai !== undefined) {
    params.is_ai = options.is_ai ? 'true' : 'false';
  }
  
  if (options?.user_id !== undefined) {
    params.user_id = options.user_id.toString();
  }
  
  console.log("[API] listAllAiMusic 호출", { params });
  
  const res = await axiosInstance.get<MusicListItem[]>('/', { params });
  
  console.log("[API] listAllAiMusic 응답", { 
    count: res.data?.length ?? 0,
    data: res.data 
  });
  
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 음악 상세 정보 조회 (앨범 이미지 포함)
 * GET /api/v1/{music_id}/
 */
export interface MusicDetailResponse {
  music_id: number;
  music_name: string;
  audio_url: string | null;
  is_ai: boolean;
  genre: string | null;
  duration: number | null;
  lyrics: string | null;
  artist_name: string | null;
  album_name: string | null;
  album_id?: number | null; // 앨범 ID (있을 수 있음)
  // 앨범 이미지 필드들 (직접 응답에 포함될 수 있음)
  image_square?: string | null;
  image_large_square?: string | null;
  album_image?: string | null;
  ai_info?: Array<{
    aiinfo_id?: number;
    input_prompt?: string;
    created_at?: string;
  }>;
  created_at: string;
  tags: string | null;
}

export async function getMusicDetail(musicId: number): Promise<MusicDetailResponse | null> {
  try {
    console.log("[API] getMusicDetail 호출", { musicId });
    const res = await axiosInstance.get<MusicDetailResponse>(`/${musicId}/`);
    console.log("[API] getMusicDetail 응답", { musicId, data: res.data });
    return res.data;
  } catch (error) {
    console.error("[API] getMusicDetail 실패", { musicId, error });
    return null;
  }
}

/**
 * 앨범 상세 정보 조회 (앨범 이미지 포함)
 * GET /api/v1/albums/{album_id}/
 */
export interface AlbumDetailResponse {
  album_id: number;
  album_name: string;
  album_image: string | null;
  image_large_square: string | null;
  artist: {
    artist_id: number;
    artist_name: string;
  };
}

export async function getAlbumDetail(albumId: number): Promise<AlbumDetailResponse | null> {
  try {
    console.log("[API] getAlbumDetail 호출", { albumId });
    const res = await axiosInstance.get<AlbumDetailResponse>(`/albums/${albumId}/`);
    console.log("[API] getAlbumDetail 응답", { albumId, data: res.data });
    return res.data;
  } catch (error) {
    console.error("[API] getAlbumDetail 실패", { albumId, error });
    return null;
  }
}

/**
 * music_id로 앨범 이미지 가져오기
 * 음악 상세 -> 앨범 상세 순서로 조회
 */
export async function getAlbumImageByMusicId(musicId: number): Promise<string | null> {
  try {
    // 1. 음악 상세 조회
    const musicDetail = await getMusicDetail(musicId);
    if (!musicDetail || !musicDetail.album_name) {
      return null;
    }

    // 2. 앨범 ID를 찾기 위해 앨범 이름으로 검색하거나, 다른 방법 사용
    // 일단 음악 상세에서 album_id를 직접 가져올 수 있는지 확인 필요
    // 없으면 앨범 이름으로 검색해야 할 수도 있음
    
    // 임시로 음악 상세 API 응답에 album_id가 포함되어 있는지 확인
    // 없으면 앨범 이름으로 검색하는 로직 추가 필요
    
    return null;
  } catch (error) {
    console.error("[API] getAlbumImageByMusicId 실패", { musicId, error });
    return null;
  }
}
