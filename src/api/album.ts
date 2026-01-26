import axiosInstance from "./axiosInstance";

// 백엔드 앨범 상세 응답 타입 (필요 필드만 정의)
export type AlbumDetailResponse = {
  album_id: number;
  album_name: string;
  album_image: string | null;
  image_large_square: string | null;
};

// 좋아요한 앨범 요약 정보
export interface LikedAlbumSummary {
  album_id: number;
  title: string;
  artist_name: string;
  cover_image: string | null;
  release_date?: string;
  like_count: number;
  is_liked: boolean;
}

// 앨범 좋아요 응답
export interface AlbumLikeResponse {
  message: string;
  album_id: number;
  is_liked: boolean;
  like_count: number;
}

// 간단한 메모리 캐시 (같은 앨범 여러 번 호출 방지)
const albumCoverCache = new Map<number, string | null>();

/**
 * 주어진 앨범 ID에 대해 가능한 가장 좋은 커버 이미지를 반환합니다.
 *
 * 우선순위: image_large_square -> album_image -> fallbackImage
 */
export async function getBestAlbumCover(
  albumId: number | null | undefined,
  fallbackImage: string | null | undefined,
): Promise<string | null> {
  // albumId가 없으면 그냥 fallback 사용
  if (!albumId) {
    return fallbackImage ?? null;
  }

  // 캐시 먼저 확인
  if (albumCoverCache.has(albumId)) {
    const cached = albumCoverCache.get(albumId)!;
    return cached ?? fallbackImage ?? null;
  }

  try {
    // axiosInstance는 /api/v1을 base로 사용한다고 가정
    const res = await axiosInstance.get<AlbumDetailResponse>(`/albums/${albumId}/`);
    const album = res.data;

    const cover =
      album.image_large_square ?? album.album_image ?? fallbackImage ?? null;

    albumCoverCache.set(albumId, cover);
    return cover;
  } catch {
    // 실패 시에는 fallback 이미지로 폴백
    return fallbackImage ?? null;
  }
}

/**
 * 앨범 좋아요 등록
 * POST /api/v1/albums/{album_id}/likes
 */
export async function likeAlbum(albumId: number | string): Promise<AlbumLikeResponse> {
  const response = await axiosInstance.post<AlbumLikeResponse>(`/albums/${albumId}/likes`);
  return response.data;
}

/**
 * 앨범 좋아요 취소
 * DELETE /api/v1/albums/{album_id}/likes
 */
export async function unlikeAlbum(albumId: number | string): Promise<AlbumLikeResponse> {
  const response = await axiosInstance.delete<AlbumLikeResponse>(`/albums/${albumId}/likes`);
  return response.data;
}

/**
 * 좋아요한 앨범 목록 조회
 * GET /api/v1/albums/likes
 */
export async function listLikedAlbums(): Promise<LikedAlbumSummary[]> {
  const response = await axiosInstance.get<LikedAlbumSummary[]>("/albums/likes");
  return response.data;
}
