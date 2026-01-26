// src/api/user.ts
import axiosInstance from "./axiosInstance";

/** =========================
 *  1) 사용자 통계 타입 정의
 *  ========================= */

/** 청취 시간 정보 */
export type ListeningTime = {
  total_seconds: number;
  total_hours: number;
  play_count: number;
  previous_period_hours: number;
  change_percent: number;
};

/** Top 장르 */
export type TopGenre = {
  rank: number;
  genre: string;
  play_count: number;
  percentage: number;
};

/** Top 아티스트 */
export type TopArtist = {
  rank: number;
  artist_id: number;
  artist_name: string;
  artist_image: string;
  play_count: number;
  percentage: number;
};

/** Top 태그 */
export type TopTag = {
  tag_id: number;
  tag_key: string;
  play_count: number;
};

/** Top 음악 */
export type TopTrack = {
  rank: number;
  music_id: number;
  music_name: string;
  artist_id: number;
  artist_name: string;
  album_id: number;
  album_name: string;
  album_image: string | null;
  play_count: number;
  percentage: number;
};

/** AI 생성 활동 */
export type AiGeneration = {
  total_generated: number;
  last_generated_at: string | null;
  last_generated_days_ago: number | null;
};

/** 전체 사용자 통계 */
export type UserStatistics = {
  listening_time: ListeningTime;
  top_genres: TopGenre[];
  top_artists: TopArtist[];
  top_tags: TopTag[];
  ai_generation: AiGeneration;
};

/** =========================
 *  2) 기간 타입 정의
 *  ========================= */

/** 조회 기간: "month" (이번 달) 또는 "all" (전체) */
export type StatisticsPeriod = "month" | "all";

/** =========================
 *  3) API 호출 함수들
 *  ========================= */

/**
 * 사용자 전체 음악 통계 조회
 * GET /users/{user_id}/statistics/?period={period}
 */
export async function fetchUserStatistics(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<UserStatistics> {
  const res = await axiosInstance.get<UserStatistics>(
    `/users/${userId}/statistics/`,
    { params: { period } }
  );
  return res.data;
}

/**
 * 사용자 청취 시간 통계 조회
 * GET /users/{user_id}/statistics/listening-time/?period={period}
 */
export async function fetchListeningTime(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<ListeningTime> {
  const res = await axiosInstance.get<ListeningTime>(
    `/users/${userId}/statistics/listening-time/`,
    { params: { period } }
  );
  return res.data;
}

/**
 * 사용자 Top 장르 통계 조회
 * GET /users/{user_id}/statistics/genres/?period={period}
 */
export async function fetchTopGenres(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<TopGenre[]> {
  const res = await axiosInstance.get<TopGenre[]>(
    `/users/${userId}/statistics/genres/`,
    { params: { period } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 사용자 Top 아티스트 통계 조회
 * GET /users/{user_id}/statistics/artists/?period={period}
 */
export async function fetchTopArtists(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<TopArtist[]> {
  const res = await axiosInstance.get<TopArtist[]>(
    `/users/${userId}/statistics/artists/`,
    { params: { period } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 사용자 Top 태그/키워드 통계 조회
 * GET /users/{user_id}/statistics/tags/?period={period}
 */
export async function fetchTopTags(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<TopTag[]> {
  const res = await axiosInstance.get<TopTag[]>(
    `/users/${userId}/statistics/tags/`,
    { params: { period } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 사용자 AI 음악 생성 활동 통계 조회
 * GET /users/{user_id}/statistics/ai-generation/?period={period}
 */
export async function fetchAiGeneration(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<AiGeneration> {
  const res = await axiosInstance.get<AiGeneration>(
    `/users/${userId}/statistics/ai-generation/`,
    { params: { period } }
  );
  return res.data;
}

/**
 * 사용자 Top 음악 차트 조회
 * GET /users/{user_id}/statistics/tracks/?period={period}&limit={limit}
 */
export async function fetchTopTracks(
  userId: string | number,
  period: StatisticsPeriod = "month",
  limit: number = 50
): Promise<TopTrack[]> {
  const res = await axiosInstance.get<TopTrack[]>(
    `/users/${userId}/statistics/tracks/`,
    { params: { period, limit } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/** =========================
 *  4) AI 음악 관련 타입 정의
 *  ========================= */

/** AI 정보 */
export type AiInfo = {
  ai_info_id?: number;
  input_prompt?: string;
  converted_prompt?: string;
  suno_task_id?: string;
  status?: string;
  created_at?: string;
};

/** 사용자 AI 음악 목록 항목 */
export type UserAiMusic = {
  music_id: number;
  music_name: string;
  artist?: {
    artist_id: number;
    artist_name: string;
    artist_image?: string;
  } | null;
  album?: {
    album_id: number;
    album_name: string;
    album_image?: string;
  } | null;
  genre?: string | null;
  duration: number; // 초 단위
  is_ai: boolean;
  audio_url?: string | null;
  lyrics?: string | null;
  album_image_square?: string | null; // AI 음악 커버 이미지
  ai_info?: AiInfo | null;
  created_at: string;
  updated_at?: string;
};

/**
 * 사용자 AI 음악 목록 조회
 * GET /api/v1/users/{user_id}/ai-music/
 */
export async function fetchUserAiMusic(
  userId: string | number
): Promise<UserAiMusic[]> {
  console.log("[API] fetchUserAiMusic 호출 시작", { 
    userId,
    url: `/users/${userId}/ai-music/`
  });
  
  try {
    const res = await axiosInstance.get<UserAiMusic[]>(
      `/users/${userId}/ai-music/`
    );
    
    console.log("[API] fetchUserAiMusic 응답 받음", {
      status: res.status,
      dataLength: res.data?.length ?? 0,
      data: res.data,
      isArray: Array.isArray(res.data),
    });
    
    const result = Array.isArray(res.data) ? res.data : [];
    console.log("[API] fetchUserAiMusic 최종 반환", { 
      resultLength: result.length,
      result: result 
    });
    
    return result;
  } catch (error) {
    console.error("[API] fetchUserAiMusic 에러", {
      userId,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
