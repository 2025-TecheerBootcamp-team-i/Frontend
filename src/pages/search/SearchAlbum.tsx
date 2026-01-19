import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

type Album = { id: string; title: string; artist: string; year?: string; image?: string | null };

// API 응답 타입
type ApiSearchResult = {
  itunes_id: number;
  music_name: string;
  artist_name: string;
  artist_id: number | null;
  album_name: string;
  album_id: number | null;
  duration: number | null;
  is_ai: boolean;
  audio_url: string | null;
  album_image: string | null;
};

type ApiSearchResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiSearchResult[];
};

// 아티스트별 앨범 API 응답 타입
type ArtistAlbum = {
  id: string;
  title: string;
  year: string;
  album_image: string | null;
};

const ALL_ALBUMS: Album[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  title: `앨범명 ${i + 1}`,
  artist: `아티스트명 ${((i % 6) + 1)}`,
}));

export default function SearchAlbum() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  // API 데이터 상태
  const [apiAlbums, setApiAlbums] = useState<ArtistAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 아티스트별 앨범 정보 가져오기
  const fetchArtistAlbums = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;

      const allAlbums: ArtistAlbum[] = [];
      const seenAlbumIds = new Set<string>();

      try {
        console.log(`[SearchAlbum] 아티스트별 앨범 정보 가져오기 시작: ${artistIds.length}개 아티스트`);

        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/albums/`;
            console.log(`[SearchAlbum] 아티스트 ${artistId}의 앨범 목록 요청: ${url}`);

            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
              const data: ArtistAlbum[] = await res.json();
              console.log(`[SearchAlbum] 아티스트 ${artistId}의 앨범 목록 수신:`, {
                artist_id: artistId,
                album_count: data.length,
                albums: data.map((a) => ({
                  id: a.id,
                  title: a.title,
                  has_image: !!a.album_image,
                  image_url: a.album_image,
                })),
              });

              return { artistId, albums: data };
            }
            return null;
          } catch (e) {
            console.error(`[SearchAlbum] 아티스트 ${artistId}의 앨범 목록 가져오기 실패:`, e);
            return null;
          }
        });

        const results = await Promise.all(promises);

        // 중복 제거 (같은 앨범 ID는 한 번만 추가)
        results.forEach((result) => {
          if (result) {
            result.albums.forEach((album) => {
              if (!seenAlbumIds.has(album.id)) {
                seenAlbumIds.add(album.id);
                allAlbums.push(album);
              }
            });
          }
        });

        console.log(`[SearchAlbum] 최종 앨범 목록: ${allAlbums.length}개 앨범`);
        allAlbums.forEach((album) => {
          if (album.album_image) {
            console.log(`[SearchAlbum] 📸 앨범 이미지:`, {
              title: album.title,
              id: album.id,
              image_url: album.album_image,
            });
          }
        });

        setApiAlbums(allAlbums);
      } catch (e) {
        console.error("[SearchAlbum] 아티스트별 앨범 정보 가져오기 오류:", e);
      }
    },
    [API_BASE]
  );

  // 검색 API 호출
  useEffect(() => {
    if (!API_BASE || !q.trim()) {
      setApiAlbums([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          q: q,
          page_size: "100",
        });

        const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`API 오류: ${res.status}`);
        }

        const data: ApiSearchResponse = await res.json();

        // 고유한 artist_id 추출 (null 제외)
        const uniqueArtistIds = Array.from(
          new Set(
            data.results
              .map((r) => r.artist_id)
              .filter((id): id is number => id !== null)
          )
        );

        console.log(`[SearchAlbum] 검색 결과에서 추출한 artist_ids:`, uniqueArtistIds);

        if (uniqueArtistIds.length > 0) {
          await fetchArtistAlbums(uniqueArtistIds);
        } else {
          setApiAlbums([]);
        }
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("[SearchAlbum] 검색 API 오류:", e);
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        setApiAlbums([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, q, fetchArtistAlbums]);

  const albums = useMemo(() => {
    if (API_BASE && q.trim() && apiAlbums.length > 0) {
      // API에서 가져온 앨범을 Album 형식으로 변환
      // 아티스트 정보는 검색 결과에서 가져와야 하는데, 여기서는 앨범 정보만 있음
      // 일단 앨범명만 표시하고, 나중에 필요하면 추가
      return apiAlbums.map((a) => ({
        id: a.id,
        title: a.title,
        artist: "", // 아티스트 정보는 별도로 관리 필요
        year: a.year,
        image: a.album_image,
      }));
    }
    if (!q) return ALL_ALBUMS;
    const lower = q.toLowerCase();
    return ALL_ALBUMS.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.artist.toLowerCase().includes(lower)
    );
  }, [API_BASE, q, apiAlbums]);

  return (
    <section className="w-full mt-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] px-8 py-10 min-h-[560px]">
      {loading && albums.length === 0 ? (
        <div className="text-center text-[#999] py-12">검색 중...</div>
      ) : error && albums.length === 0 ? (
        <div className="text-center text-red-400 py-12">
          오류가 발생했습니다: {error}
        </div>
      ) : (
        <>
          {/* 앨범 그리드 */}
          <div
            className="
              grid
              [grid-template-columns:repeat(4,220px)]
              justify-center
              gap-x-8 gap-y-12
            "
          >
            {albums.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/album/${a.id}`)}
                className="
                  group
                  rounded-2xl
                  p-2
                  flex flex-col items-center text-left
                  transition
                "
              >
                {/* 앨범 커버 */}
                <div
                  className="
                    w-52 h-52
                    rounded-2xl
                    bg-[#777777]
                    border border-[#464646]
                    transition
                    hover:shadow-[0_10px_28px_rgba(0,0,0,0.38)]
                    overflow-hidden
                    relative
                  "
                >
                  {a.image ? (
                    <>
                      <img
                        src={
                          a.image.startsWith("http") || a.image.startsWith("//")
                            ? a.image
                            : API_BASE && a.image.startsWith("/")
                            ? `${API_BASE.replace("/api/v1", "")}${a.image}`
                            : a.image
                        }
                        alt={a.title}
                        className="w-full h-full object-cover relative z-10"
                        onError={(e) => {
                          console.error(`[SearchAlbum] ❌ 앨범 이미지 로드 실패:`, {
                            title: a.title,
                            id: a.id,
                            image_url: a.image,
                          });
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        onLoad={(e) => {
                          console.log(`[SearchAlbum] ✅ 앨범 이미지 로드 성공:`, {
                            title: a.title,
                            id: a.id,
                            image_url: a.image,
                          });
                          const img = e.target as HTMLImageElement;
                          const fallback = img.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = "none";
                          }
                        }}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-[#777777] animate-pulse z-0" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#777777]" />
                  )}
                </div>

                {/* 텍스트 */}
                <div className="mt-4 w-full min-w-0">
                  <div className="text-base font-semibold text-[#f6f6f6] truncate group-hover:text-[#AFDEE2] transition">
                    {a.title}
                  </div>
                  {a.artist && (
                    <div className="mt-1 text-sm text-[#f6f6f6]/60 truncate">{a.artist}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 결과 없음 */}
          {q && albums.length === 0 && !loading && (
            <div className="mt-12 text-center text-sm text-[#8A8A8A]">
              <span className="text-[#f6f6f6]/80">{q}</span>에 해당하는 앨범이 없습니다.
            </div>
          )}
        </>
      )}
    </section>
  );
}
