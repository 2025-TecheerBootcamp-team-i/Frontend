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
 * GET /api/v1/users/{user_id}/statistics/?period={period}
 */
export async function fetchUserStatistics(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<UserStatistics> {
  const res = await axiosInstance.get<UserStatistics>(
    `/api/v1/users/${userId}/statistics/`,
    { params: { period } }
  );
  return res.data;
}

/**
 * 사용자 청취 시간 통계 조회
 * GET /api/v1/users/{user_id}/statistics/listening-time/?period={period}
 */
export async function fetchListeningTime(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<ListeningTime> {
  const res = await axiosInstance.get<ListeningTime>(
    `/api/v1/users/${userId}/statistics/listening-time/`,
    { params: { period } }
  );
  return res.data;
}

/**
 * 사용자 Top 장르 통계 조회
 * GET /api/v1/users/{user_id}/statistics/genres/?period={period}
 */
export async function fetchTopGenres(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<TopGenre[]> {
  const res = await axiosInstance.get<TopGenre[]>(
    `/api/v1/users/${userId}/statistics/genres/`,
    { params: { period } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 사용자 Top 아티스트 통계 조회
 * GET /api/v1/users/{user_id}/statistics/artists/?period={period}
 */
export async function fetchTopArtists(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<TopArtist[]> {
  const res = await axiosInstance.get<TopArtist[]>(
    `/api/v1/users/${userId}/statistics/artists/`,
    { params: { period } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 사용자 Top 태그/키워드 통계 조회
 * GET /api/v1/users/{user_id}/statistics/tags/?period={period}
 */
export async function fetchTopTags(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<TopTag[]> {
  const res = await axiosInstance.get<TopTag[]>(
    `/api/v1/users/${userId}/statistics/tags/`,
    { params: { period } }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 사용자 AI 음악 생성 활동 통계 조회
 * GET /api/v1/users/{user_id}/statistics/ai-generation/?period={period}
 */
export async function fetchAiGeneration(
  userId: string | number,
  period: StatisticsPeriod = "month"
): Promise<AiGeneration> {
  const res = await axiosInstance.get<AiGeneration>(
    `/api/v1/users/${userId}/statistics/ai-generation/`,
    { params: { period } }
  );
  return res.data;
}
