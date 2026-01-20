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
