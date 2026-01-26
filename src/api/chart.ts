// src/api/chart.ts
import axiosInstance from "./axiosInstance";

/** =========================
 *  1) 차트 타입(3종)
 *  ========================= */
export type ChartType = "realtime" | "daily" | "ai";

/** =========================
 *  2) 서버 응답 DTO 타입 (3종 동일 구조)
 *  ========================= */
export type ChartResponseDTO = {
  type: ChartType;          // "realtime" | "daily" | "ai"
  generated_at: string;     // ISO
  total_count: number;
  items: ChartItemDTO[];
};

export type ChartItemDTO = {
  rank: number;
  play_count: number;
  rank_change: number | null;  // 순위 변동 (null이면 NEW)
  music: MusicDTO;
};

export type MusicDTO = {
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
  duration: number;
  is_ai: boolean;
  audio_url?: string | null;
  itunes_id?: number | null;
};


/** =========================
 *  3) UI에서 쓰는 타입
 *  ========================= */
export type ChartRow = {
  rank: number;
  playCount: number;
  rankChange: number | null;  // 순위 변동 (null이면 NEW)

  musicId: string;
  musicName: string;
  artistName: string;
  albumName: string;
  albumImage?: string;

  genre: string;
  durationSec: number;
  isAi: boolean;

  audioUrl: string;
  itunesId: string;
};

export type ChartData = {
  type: ChartType;
  generatedAt: string;
  totalCount: number;
  items: ChartRow[];
};

/** =========================
 *  4) DTO -> UI 모델 매핑
 *  ========================= */
function mapChartRow(item: ChartItemDTO): ChartRow {
  const m = item.music;

  return {
    rank: item.rank,
    playCount: item.play_count,
    rankChange: item.rank_change,

    musicId: String(m.music_id),
    musicName: m.music_name ?? "제목 없음",
    artistName: m.artist?.artist_name ?? "알 수 없는 아티스트",
    albumName: m.album?.album_name ?? "—",
    albumImage: m.album?.album_image,

    genre: m.genre ?? "—",
    durationSec: Number.isFinite(m.duration) ? m.duration : 0,
    isAi: Boolean(m.is_ai),

    audioUrl: m.audio_url ?? "",
    itunesId: String(m.itunes_id),
  };
}

function mapChartDTO(dto: ChartResponseDTO): ChartData {
  return {
    type: dto.type,
    generatedAt: dto.generated_at,
    totalCount: dto.total_count,
    items: Array.isArray(dto.items) ? dto.items.map(mapChartRow) : [],
  };
}

// ** =========================
//  *  5) API 호출 함수들 (artist.ts처럼 한 파일에서 관리)
//  *  =========================

const ENDPOINT_BY_TYPE: Record<ChartType, string> = {
  realtime: "/charts/realtime",
  daily: "/charts/daily",
  ai: "/charts/ai",
};

/** 타입만 바꿔 호출하면 됨 */
export async function fetchChart(type: ChartType): Promise<ChartData> {
  const res = await axiosInstance.get<ChartResponseDTO>(ENDPOINT_BY_TYPE[type]);
  return mapChartDTO(res.data);
}

/** (선택) 편의 함수: 기존 코드에서 더 읽기 쉽게 */
export async function fetchRealtimeChart(): Promise<ChartData> {
  return fetchChart("realtime");
}
export async function fetchDailyChart(): Promise<ChartData> {
  return fetchChart("daily");
}
export async function fetchAiChart(): Promise<ChartData> {
  return fetchChart("ai");
}
