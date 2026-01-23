import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

type Artist = { id: string; name: string; image?: string | null };

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

// 아티스트 상세 API 응답 타입
type ArtistDetail = {
  artist_id: number;
  artist_name: string;
  artist_image: string | null;
};

const ALL_ARTISTS: Artist[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  name: `아티스트명 ${i + 1}`,
}));

export default function SearchArtist() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const __DEV__ = import.meta.env.DEV;

  // API 데이터 상태
  const [apiArtists, setApiArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artistDetails, setArtistDetails] = useState<Record<number, ArtistDetail>>({});

  // 아티스트 상세 정보 가져오기 (이미지 포함)
  const fetchArtistDetails = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;

      const detailsMap: Record<number, ArtistDetail> = {};

      try {
        console.log(`[SearchArtist] 아티스트 상세 정보 가져오기 시작: ${artistIds.length}개 아티스트`);

        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/`;
            console.log(`[SearchArtist] 아티스트 ${artistId} 상세 정보 요청: ${url}`);

            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
              const data: ArtistDetail = await res.json();
              console.log(`[SearchArtist] 아티스트 ${artistId} 상세 정보 수신:`, {
                artist_id: data.artist_id,
                artist_name: data.artist_name,
                has_image: !!data.artist_image,
                image_url: data.artist_image,
              });

              return { artistId, data };
            }
            return null;
          } catch (e) {
            console.error(`[SearchArtist] 아티스트 ${artistId} 상세 정보 가져오기 실패:`, e);
            return null;
          }
        });

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result) {
            detailsMap[result.artistId] = result.data;
          }
        });

        console.log(`[SearchArtist] 아티스트 상세 정보 가져오기 완료: ${Object.keys(detailsMap).length}개`);
        setArtistDetails(detailsMap);
      } catch (e) {
        console.error("[SearchArtist] 아티스트 상세 정보 가져오기 오류:", e);
      }
    },
    [API_BASE]
  );

  // 검색 API 호출
  useEffect(() => {
    if (!API_BASE || !q.trim()) {
      setApiArtists([]);
      setArtistDetails({});
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

        // 아티스트 정보 추출 (중복 제거)
        const artistMap = new Map<number, Artist>();
        data.results.forEach((r) => {
          if (r.artist_id && !artistMap.has(r.artist_id)) {
            artistMap.set(r.artist_id, {
              id: String(r.artist_id),
              name: r.artist_name,
            });
          }
        });

        const extractedArtists = Array.from(artistMap.values());
        setApiArtists(extractedArtists);

        // 고유한 artist_id 추출
        const uniqueArtistIds = Array.from(
          new Set(
            data.results
              .map((r) => r.artist_id)
              .filter((id): id is number => id !== null)
          )
        ).slice(0,16);

        if (uniqueArtistIds.length > 0) {
          await fetchArtistDetails(uniqueArtistIds);
        }
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("[SearchArtist] 검색 API 오류:", e);
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        setApiArtists([]);
        setArtistDetails({});
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, q, fetchArtistDetails]);

  const artists = useMemo(() => {
    let result: Artist[];

    if (API_BASE && q.trim() && apiArtists.length > 0) {
      // API에서 가져온 아티스트에 이미지 정보 추가
      result = apiArtists.map((artist) => {
        const detail = artistDetails[Number(artist.id)];
        return {
          ...artist,
          image: detail?.artist_image || null,
        };
      });
    } else {
      if (!q) {
        result = ALL_ARTISTS;
      } else {
        const lower = q.toLowerCase();
        result = ALL_ARTISTS.filter((a) => a.name.toLowerCase().includes(lower));
      }
    }

    return result;
  }, [API_BASE, q, apiArtists, artistDetails]);

  return (
    <section className="w-full mt-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 px-8 py-10 min-h-[560px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      {/* 아티스트 그리드 */}
      {loading && artists.length === 0 ? (
        <div className="text-center text-white/20 py-12 uppercase font-light tracking-widest">검색 중...</div>
      ) : error && artists.length === 0 ? (
        <div className="text-center text-red-400 py-12">
          오류가 발생했습니다: {error}
        </div>
      ) : (
        <>
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
            {artists.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/artists/${a.id}`)}
                className="
                  group
                  rounded-3xl
                  p-2
                  flex flex-col items-center text-center
                  transition-all duration-500
                  hover:-translate-y-2
                "
              >
                {/* 썸네일 - 유리구슬 효과 적용 */}
                <div
                  className="
                    w-52 h-52
                    rounded-full
                    bg-white/5
                    transition-all duration-700
                    border border-white/20
                    group-hover:border-white/40
                    group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(175,222,226,0.2)]
                    overflow-hidden
                    relative
                    backdrop-blur-xl
                    shadow-[inset_0_2px_10px_rgba(255,255,255,0.2),0_10px_20px_rgba(0,0,0,0.3)]
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
                        alt={a.name}
                        className="w-full h-full object-cover relative z-10 transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100 brightness-95 group-hover:brightness-110"
                        onError={(e) => {
                          if (__DEV__) console.error("[SearchArtist] ❌ 이미지 로드 실패", { name: a.name, id: a.id, image_url: a.image });
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          const fallback = img.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "none";
                        }}                        
                        loading="lazy"
                      />
                      
                      {/* 유리구슬 효과 레이어들 */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/20 pointer-events-none z-20" />
                      <div className="absolute top-[8%] left-[15%] w-[45%] h-[25%] bg-gradient-to-b from-white/50 to-transparent rounded-[100%] rotate-[-15deg] blur-[3px] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity z-20" />
                      <div className="absolute bottom-[5%] right-[10%] w-[35%] h-[20%] bg-white/30 blur-[10px] rounded-full pointer-events-none z-20" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                </div>

                {/* 텍스트 */}
                <div className="mt-6 text-lg font-bold text-white truncate w-full group-hover:text-[#AFDEE2] transition-colors tracking-tight px-2">
                  {a.name}
                </div>
                <div className="mt-1 text-xs font-medium text-white/30 tracking-widest uppercase">아티스트</div>
              </button>
            ))}
          </div>
          </div>
        </>
      )}
    </section>
  );
}
