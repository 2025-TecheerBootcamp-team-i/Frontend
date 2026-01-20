// src/api/music.ts
import axiosInstance from "./axiosInstance";

/**
 * 음악 재생 로그 기록
 * POST /api/v1/tracks/{musicId}/play
 */
export async function logPlayTrack(musicId: number): Promise<void> {
  try {
    await axiosInstance.post(`/api/v1/tracks/${musicId}/play`);
  } catch (error) {
    console.error("[API] Failed to log play track:", error);
    // 로그 기록 실패는 재생을 방해하지 않도록 에러를 삼킴
  }
}

/**
 * 음악 오디오 URL 가져오기
 * GET /api/v1/tracks/{musicId}/play
 */
export async function fetchAudioUrl(musicId: number): Promise<string> {
  const res = await axiosInstance.get<{ audio_url: string }>(
    `/api/v1/tracks/${musicId}/play`
  );
  return res.data.audio_url;
}
