// src/api/ai.ts
import axiosInstance from "./axiosInstance";

/**
 * AI 음악 생성 요청 바디 타입
 */
export interface GenerateMusicRequest {
  prompt: string;
  user_id: number;
  make_instrumental: boolean;
}

/**
 * AI 음악 생성 (비동기) 응답 타입
 */
export interface GenerateMusicAsyncResponse {
  task_id: string;
  status: string;
  message: string;
}

/**
 * Celery 작업 상태 조회 응답 타입
 */
export interface TaskStatusResponse {
  task_id: string;
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY" | "REVOKED";
  result?: {
    music_id: number;
    music_name: string;
    artist_name: string;
    album_name: string;
    audio_url: string;
    duration: number;
    genre: string;
    is_ai: boolean;
    created_at: string;
  };
  error?: string;
}

/**
 * AI 음악 생성 (비동기)
 * POST /api/v1/music/generate-async/
 * 
 * 백엔드에서 자동으로 Llama를 거쳐서 프롬프트를 가공한 후 Suno API로 음악을 생성합니다.
 * 
 * @param payload - 음악 생성 요청 데이터
 * @returns task_id를 포함한 응답
 */
export async function generateMusicAsync(
  payload: GenerateMusicRequest
): Promise<GenerateMusicAsyncResponse> {
  console.log("[API] 음악 생성 요청:", payload);
  const res = await axiosInstance.post<GenerateMusicAsyncResponse>(
    "/generate-async/",
    payload
  );
  console.log("[API] 음악 생성 응답:", res.data);
  return res.data;
}

/**
 * Celery 작업 상태 조회
 * GET /api/v1/music/task/{task_id}/
 * 
 * @param taskId - Celery task ID
 * @returns 작업 상태 및 결과
 */
export async function getTaskStatus(
  taskId: string
): Promise<TaskStatusResponse> {
  console.log(`[API] 작업 상태 조회: task_id=${taskId}`);
  const res = await axiosInstance.get<TaskStatusResponse>(
    `/task/${taskId}/`
  );
  console.log(`[API] 작업 상태 응답:`, res.data);
  return res.data;
}
