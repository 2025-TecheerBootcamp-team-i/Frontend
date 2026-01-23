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
  const __DEV__ = import.meta.env.DEV;

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
        ).slice(0,12);

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
    <section className="w-full mt-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 px-8 py-10 min-h-[560px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      {loading && albums.length === 0 ? (
        <div className="text-center text-white/20 py-12 uppercase font-light tracking-widest">검색 중...</div>
      ) : error && albums.length === 0 ? (
        <div className="text-center text-red-400 py-12">
          오류가 발생했습니다: {error}
        </div>
      ) : (
        <>
          {/* 앨범 그리드 */}
          <div className="overflow-x-auto no-scrollbar">
          <div
            className="
              grid
              gap-x-10
              gap-y-12
              justify-between
              [grid-template-columns:repeat(4,220px)]
              px-4
            "
          >
            {albums.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/album/${a.id}`)}
                className="
                  group
                  rounded-3xl
                  p-2
                  flex flex-col items-center text-left
                  transition-all duration-500
                  hover:-translate-y-2
                "
              >
                {/* 앨범 커버 */}
                <div className="w-[208px]">
                <div
                  className="
                    w-52 h-52
                    rounded-[32px]
                    bg-white/5
                    transition-all duration-700
                    border border-white/10
                    group-hover:border-white/30
                    group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(175,222,226,0.2)]
                    overflow-hidden
                    relative
                    backdrop-blur-xl
                  "
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-pulse" />
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
                        className="w-full h-full object-cover relative z-10 transition-transform duration-1000 group-hover:scale-110"
                        onError={(e) => {
                          if (__DEV__) {
                            console.error("[SearchAlbum] ❌ 앨범 이미지 로드 실패:", {
                              title: a.title,
                              id: a.id,
                              image_url: a.image,
                            });
                          }
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          const fallback = img.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "none";
                        }}
                        
                        loading="lazy"
                      />
                      
                      {/* 오버레이 재생 아이콘 효과 */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 duration-500">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 scale-75 group-hover:scale-100 transition-transform duration-700">
                          <FaPlay className="text-white ml-1" size={20} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                </div>

                {/* 텍스트 */}
                <div className="mt-5 w-full min-w-0 px-1">
                  <div className="text-base font-bold text-white truncate group-hover:text-[#AFDEE2] transition-colors tracking-tight">
                    {a.title}
                  </div>
                  {a.artist ? (
                    <div className="mt-1 text-sm text-white/30 truncate font-medium">{a.artist}</div>
                  ) : (
                    <div className="mt-1 text-xs font-light text-white/20 tracking-widest uppercase">앨범</div>
                  )}
                </div>
                </div>
              </button>
            ))}
          </div>
          </div>
        </>
      )}
    </section>
  );
}
