// src/pages/search/SearchHome.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdOutlineNavigateNext, MdPlayArrow } from "react-icons/md";

// ✅ MyPlaylistPage 디자인 참고용 스크롤러(디자인만)
type HorizontalScrollerProps = {
  children: React.ReactNode;
  scrollStep?: number;
  gradientFromClass?: string;
};

function HorizontalScroller({
  children,
  scrollStep = 300,
  gradientFromClass = "from-[#2d2d2d]/80",
}: HorizontalScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;

    const can = el.scrollWidth > el.clientWidth + 1;
    setCanScroll(can);

    if (!can) {
      setShowLeft(false);
      setShowRight(false);
      return;
    }

    const left = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;

    setShowLeft(left > 4);
    setShowRight(left < max - 4);
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="relative mt-2">
      <div ref={ref} onScroll={update} className="overflow-x-auto overflow-y-hidden no-scrollbar">
        {children}
      </div>

      {canScroll && showLeft && (
        <button
          type="button"
          onClick={() => {
            ref.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
            setTimeout(update, 250);
          }}
          className="
            absolute left-1 top-1/2 -translate-y-1/2 z-10
            h-9 w-9 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
          aria-label="왼쪽으로 이동"
        >
          <MdOutlineNavigateNext className="rotate-180" size={22} />
        </button>
      )}

      {canScroll && showRight && (
        <button
          type="button"
          onClick={() => {
            ref.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
            setTimeout(update, 250);
          }}
          className="
            absolute right-1 top-1/2 -translate-y-1/2 z-10
            h-9 w-9 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
          aria-label="오른쪽으로 이동"
        >
          <MdOutlineNavigateNext size={22} />
        </button>
      )}

      {canScroll && showRight && (
        <div
          className={[
            "pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l to-transparent",
            gradientFromClass,
          ].join(" ")}
        />
      )}
      {canScroll && showLeft && (
        <div
          className={[
            "pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r to-transparent",
            gradientFromClass,
          ].join(" ")}
        />
      )}
    </div>
  );
}

type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  albumId?: number | null;
  artistId?: number | null;
  albumName?: string;
};
type Artist = { id: string; name: string; image?: string | null };
type Album = { id: string; name: string; artist: string };

// 아티스트 상세 API 응답 타입
type ArtistDetail = {
  artist_id: number;
  artist_name: string;
  artist_image: string | null;
};

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

// ✅ 더미 데이터 (나중에 API로 교체)
const ALL_SONGS: Song[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  title: "곡 명",
  artist: "아티스트명",
  duration: "2:27",
}));

const ALL_ARTISTS: Artist[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  name: `인기 아티스트 ${i + 1}`,
}));

const ALL_ALBUMS: Album[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  name: `앨범 ${i + 1}`,
  artist: `아티스트명 ${((i % 3) + 1).toString()}`,
}));

function SectionShell({
  title,
  onMore,
  children,
}: {
  title: string;
  onMore?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646]">
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onMore}
          className="text-lg font-semibold hover:text-[#888] text-[#F6F6F6]"
        >
          {title}
        </button>

        <button
          type="button"
          onClick={onMore}
          className="text-[#F6F6F6] hover:text-[#888] transition text-xl leading-none"
          aria-label={`${title} 더보기`}
          title="더보기"
        >
          <MdOutlineNavigateNext size={30} />
        </button>
      </div>

      <div className="mb-4 mx-4 border-b border-[#464646]" />
      <div className="px-6 pb-6">{children}</div>
    </section>
  );
}

export default function SearchHome() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const q = (sp.get("q") ?? "").trim();
  const search = q ? `?q=${encodeURIComponent(q)}` : "";

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  // API 데이터 상태
  const [apiSongs, setApiSongs] = useState<Song[]>([]);
  const [apiArtists, setApiArtists] = useState<Artist[]>([]);
  const [apiAlbums, setApiAlbums] = useState<ArtistAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [artistDetails, setArtistDetails] = useState<Record<number, ArtistDetail>>({});

  // 아티스트 상세 정보 가져오기 (이미지 포함)
  const fetchArtistDetails = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;

      const detailsMap: Record<number, ArtistDetail> = {};

      try {
        console.log(`[SearchAll] 아티스트 상세 정보 가져오기 시작: ${artistIds.length}개 아티스트`);

        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/`;
            console.log(`[SearchAll] 아티스트 ${artistId} 상세 정보 요청: ${url}`);

            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
              const data: ArtistDetail = await res.json();
              console.log(`[SearchAll] 아티스트 ${artistId} 상세 정보 수신:`, {
                artist_id: data.artist_id,
                artist_name: data.artist_name,
                has_image: !!data.artist_image,
                image_url: data.artist_image,
              });

              return { artistId, data };
            }
            return null;
          } catch (e) {
            console.error(`[SearchAll] 아티스트 ${artistId} 상세 정보 가져오기 실패:`, e);
            return null;
          }
        });

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result) {
            detailsMap[result.artistId] = result.data;
          }
        });

        console.log(`[SearchAll] 아티스트 상세 정보 가져오기 완료: ${Object.keys(detailsMap).length}개`);
        setArtistDetails(detailsMap);
      } catch (e) {
        console.error("[SearchAll] 아티스트 상세 정보 가져오기 오류:", e);
      }
    },
    [API_BASE]
  );

  // 아티스트별 앨범 정보 가져오기
  const fetchArtistAlbums = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;

      const allAlbums: ArtistAlbum[] = [];
      const seenAlbumIds = new Set<string>();

      try {
        console.log(`[SearchAll] 아티스트별 앨범 정보 가져오기 시작: ${artistIds.length}개 아티스트`);

        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/albums/`;
            console.log(`[SearchAll] 아티스트 ${artistId}의 앨범 목록 요청: ${url}`);

            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
              const data: ArtistAlbum[] = await res.json();
              console.log(`[SearchAll] 아티스트 ${artistId}의 앨범 목록 수신:`, {
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
            console.error(`[SearchAll] 아티스트 ${artistId}의 앨범 목록 가져오기 실패:`, e);
            return null;
          }
        });

        const results = await Promise.all(promises);

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

        console.log(`[SearchAll] 최종 앨범 목록: ${allAlbums.length}개 앨범`);
        allAlbums.forEach((album) => {
          if (album.album_image) {
            console.log(`[SearchAll] 📸 앨범 이미지:`, {
              title: album.title,
              id: album.id,
              image_url: album.album_image,
            });
          }
        });

        setApiAlbums(allAlbums);
      } catch (e) {
        console.error("[SearchAll] 아티스트별 앨범 정보 가져오기 오류:", e);
      }
    },
    [API_BASE]
  );

  // 검색 API 호출
  useEffect(() => {
    if (!API_BASE || !q.trim()) {
      setApiSongs([]);
      setApiArtists([]);
      setApiAlbums([]);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);

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

        // 곡 정보 변환
        const convertedSongs: Song[] = data.results.map((r) => ({
          id: String(r.itunes_id),
          title: r.music_name,
          artist: r.artist_name,
          duration: r.duration
            ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, "0")}`
            : "2:27",
          albumId: r.album_id,
          artistId: r.artist_id,
          albumName: r.album_name,
        }));

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

        setApiSongs(convertedSongs);
        setApiArtists(Array.from(artistMap.values()));

        // 고유한 artist_id 추출
        const uniqueArtistIds = Array.from(
          new Set(
            data.results
              .map((r) => r.artist_id)
              .filter((id): id is number => id !== null)
          )
        );

        if (uniqueArtistIds.length > 0) {
          await Promise.all([
            fetchArtistAlbums(uniqueArtistIds),
            fetchArtistDetails(uniqueArtistIds),
          ]);
        }
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("[SearchAll] 검색 API 오류:", e);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, q, fetchArtistAlbums]);

  // ✅ 검색어 필터
  const songs = useMemo(() => {
    if (API_BASE && q.trim() && apiSongs.length > 0) {
      return apiSongs;
    }
    if (!q) return ALL_SONGS;
    const lower = q.toLowerCase();
    return ALL_SONGS.filter(
      (s) => s.title.toLowerCase().includes(lower) || s.artist.toLowerCase().includes(lower)
    );
  }, [API_BASE, q, apiSongs]);

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

  const albums = useMemo(() => {
    if (API_BASE && q.trim() && apiAlbums.length > 0) {
      return apiAlbums.map((a) => ({
        id: a.id,
        name: a.title,
        artist: "", // 아티스트 정보는 별도로 표시하지 않음
      }));
    }
    if (!q) return ALL_ALBUMS;
    const lower = q.toLowerCase();
    return ALL_ALBUMS.filter(
      (a) => a.name.toLowerCase().includes(lower) || a.artist.toLowerCase().includes(lower)
    );
  }, [API_BASE, q, apiAlbums]);

  // 상위 결과: 검색어가 아티스트명과 일치하면 아티스트 우선, 아니면 곡 우선
  const featured = useMemo(() => {
    if (API_BASE && q.trim()) {
      const searchLower = q.toLowerCase().trim();
      
      // 검색어가 아티스트명과 정확히 일치하는 아티스트 찾기
      const exactArtistMatch = artists.find(
        (a) => a.name.toLowerCase().trim() === searchLower
      );
      
      // 정확히 일치하는 아티스트가 있으면 아티스트 우선 표시
      if (exactArtistMatch) {
        return { type: "artist" as const, data: exactArtistMatch };
      }
      
      // 검색어가 아티스트명에 포함되는 아티스트 찾기 (정확한 일치가 없을 때)
      const partialArtistMatch = artists.find(
        (a) => a.name.toLowerCase().includes(searchLower)
      );
      
      // 아티스트가 곡보다 많거나, 아티스트가 있고 곡이 적으면 아티스트 우선
      if (artists.length > 0) {
        if (apiSongs.length === 0 || artists.length > apiSongs.length || partialArtistMatch) {
          return { type: "artist" as const, data: artists[0] };
        }
      }
      
      // 곡이 있으면 곡 표시
      if (apiSongs.length > 0) {
        return { type: "song" as const, data: apiSongs[0] };
      }
      
      // 곡이 없고 아티스트만 있으면 아티스트
      if (artists.length > 0) {
        return { type: "artist" as const, data: artists[0] };
      }
      
      return null;
    }
    
    // 더미 데이터 사용 시
    if (songs.length > 0) {
      return { type: "song" as const, data: songs[0] };
    }
    if (artists.length > 0) {
      return { type: "artist" as const, data: artists[0] };
    }
    return null;
  }, [API_BASE, q, apiSongs, songs, artists]);

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <div className="space-y-4">
          {/* ✅ 상단 2열 (MyPlaylistPage 느낌으로 카드 통일) */}
          <div className="overflow-x-auto">
          <div className="grid gap-4 grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)] min-w-[920px]">
            {/* 대표 카드 */}
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
              <div className="px-8 pt-6 pb-2 flex items-center justify-between">
                <div className="text-lg font-semibold text-[#F6F6F6]">상위 결과</div>
              </div>

              <div className="mx-4 border-b border-[#464646]" />

              <div className="p-4">
              {/* ✅ 상위 결과 카드 본문 */}
              <div
                className="
                  group relative
                  h-full
                  w-full
                  rounded-3xl
                  hover:bg-[#1d1d1d]/45 transition
                  p-4
                "
              >
                {(() => {
                  if (!featured) {
                    return (
                      <div className="flex flex-col">
                        <div className="w-[200px] h-[200px] bg-[#777777] rounded-2xl" />
                        <div className="mt-5 min-w-0">
                          <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                            검색 결과 없음
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isArtist = featured.type === "artist";
                  const artistData = isArtist ? featured.data : null;
                  const songData = !isArtist ? featured.data : null;

                  // 곡일 때 앨범 이미지 찾기
                  let songAlbumImage: string | null = null;
                  if (!isArtist && songData) {
                    const apiSong = apiSongs.find((as) => as.id === songData.id);
                    if (apiSong?.albumId) {
                      const album = apiAlbums.find((a) => a.id === String(apiSong.albumId));
                      songAlbumImage = album?.album_image || null;
                    }
                  }

                  return (
                    <div className="flex flex-col">
                      {/* 커버/이미지 */}
                      <div
                        className={[
                          "w-[228px] h-[228px] bg-[#777777] relative overflow-hidden",
                          isArtist ? "rounded-full" : "rounded-2xl",
                        ].join(" ")}
                      >
                        {isArtist && artistData?.image ? (
                          <>
                            <img
                              src={
                                artistData.image.startsWith("http") || artistData.image.startsWith("//")
                                  ? artistData.image
                                  : API_BASE && artistData.image.startsWith("/")
                                  ? `${API_BASE.replace("/api/v1", "")}${artistData.image}`
                                  : artistData.image
                              }
                              alt={artistData.name}
                              className="w-full h-full object-cover relative z-10"
                              onError={(e) => {
                                console.error(`[SearchAll] ❌ 상위 결과 아티스트 이미지 로드 실패:`, {
                                  name: artistData.name,
                                  image_url: artistData.image,
                                });
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                              onLoad={(e) => {
                                console.log(`[SearchAll] ✅ 상위 결과 아티스트 이미지 로드 성공:`, {
                                  name: artistData.name,
                                  image_url: artistData.image,
                                });
                                const img = e.target as HTMLImageElement;
                                const fallback = img.nextElementSibling as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = "none";
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-[#777777] animate-pulse z-0" />
                          </>
                        ) : !isArtist && songData && songAlbumImage ? (
                          <>
                            <img
                              src={
                                songAlbumImage.startsWith("http") || songAlbumImage.startsWith("//")
                                  ? songAlbumImage
                                  : API_BASE && songAlbumImage.startsWith("/")
                                  ? `${API_BASE.replace("/api/v1", "")}${songAlbumImage}`
                                  : songAlbumImage
                              }
                              alt={songData.title}
                              className="w-full h-full object-cover relative z-10"
                              onError={(e) => {
                                console.error(`[SearchAll] ❌ 상위 결과 곡 앨범 이미지 로드 실패:`, {
                                  song: songData.title,
                                  image_url: songAlbumImage,
                                });
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                              onLoad={(e) => {
                                console.log(`[SearchAll] ✅ 상위 결과 곡 앨범 이미지 로드 성공:`, {
                                  song: songData.title,
                                  image_url: songAlbumImage,
                                });
                                const img = e.target as HTMLImageElement;
                                const fallback = img.nextElementSibling as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = "none";
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-[#777777] animate-pulse z-0" />
                          </>
                        ) : (
                          <div className="w-full h-full bg-[#777777]" />
                        )}
                      </div>

                      {/* 텍스트 */}
                      <div className="mt-5 min-w-0">
                        <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                          {isArtist ? artistData?.name : songData?.title || "곡명"}
                        </div>
                        <div className="mt-1 text-sm text-[#F6F6F6]/60 truncate">
                          {isArtist ? "아티스트" : songData?.artist || "아티스트명"}
                        </div>
                      </div>

                      {/* ▶ 재생 버튼 (곡일 때만 표시) */}
                      {!isArtist && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 여기서 실제 재생 연결
                          }}
                          className="
                            absolute right-0 bottom-4
                            -translate-x-4 -translate-y-4
                            w-12 h-12 rounded-full
                            bg-[#AFDEE2] text-[#1d1d1d]
                            grid place-items-center
                            shadow-lg
                            hover:bg-[#87B2B6] transition

                            opacity-0 translate-y-1 pointer-events-none
                            group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                          "
                          aria-label="재생"
                          title="재생"
                        >
                          <MdPlayArrow size={26} />
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
              </div>
            </section>

            {/* 곡 리스트 카드 (MyPlaylistPage 테두리/구분선 스타일로) */}
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
              <div className="px-8 pt-6 pb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/search/song${search}`)}
                  className="text-lg font-semibold hover:text-[#888] text-[#F6F6F6]"
                >
                  곡
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/search/song${search}`)}
                  className="text-[#F6F6F6] hover:text-[#888] transition text-xl leading-none"
                  aria-label="곡 더보기"
                  title="더보기"
                >
                  <MdOutlineNavigateNext size={30} />
                </button>
              </div>

              <div className="mx-4 border-b border-[#464646]" />

              <div className="pb-2 px-4">
                {(songs.length ? songs : ALL_SONGS).slice(0, 4).map((s) => {
                  // API에서 가져온 곡인지 확인하고 앨범 이미지 찾기
                  const apiSong = apiSongs.find((as) => as.id === s.id);
                  let albumImage: string | null = null;

                  if (apiSong?.albumId) {
                    // album_id로 앨범 이미지 찾기
                    const album = apiAlbums.find((a) => a.id === String(apiSong.albumId));
                    albumImage = album?.album_image || null;
                    
                    if (!albumImage) {
                      console.log(`[SearchAll] 앨범 이미지 없음:`, {
                        song: s.title,
                        album_id: apiSong.albumId,
                        available_albums: apiAlbums.map((a) => ({ id: a.id, title: a.title })),
                      });
                    }
                  }

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate(`/search/song${search}`)}
                      className="w-full text-left px-2 py-3 hover:bg-white/5 transition border-b border-[#464646] last:border-b-0"
                    >
                      <div className="flex items-center gap-4">
                        {/* 앨범 이미지 */}
                        <div className="h-12 w-12 rounded-xl bg-[#6b6b6b]/50 border border-[#464646] overflow-hidden relative flex-shrink-0">
                          {albumImage ? (
                            <>
                              <img
                                src={
                                  albumImage.startsWith("http") || albumImage.startsWith("//")
                                    ? albumImage
                                    : API_BASE && albumImage.startsWith("/")
                                    ? `${API_BASE.replace("/api/v1", "")}${albumImage}`
                                    : albumImage
                                }
                                alt={s.title}
                                className="w-full h-full object-cover relative z-10"
                                onError={(e) => {
                                  console.error(`[SearchAll] ❌ 곡 앨범 이미지 로드 실패:`, {
                                    song: s.title,
                                    album_id: apiSong?.albumId,
                                    image_url: albumImage,
                                  });
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                                onLoad={(e) => {
                                  console.log(`[SearchAll] ✅ 곡 앨범 이미지 로드 성공:`, {
                                    song: s.title,
                                    album_id: apiSong?.albumId,
                                    image_url: albumImage,
                                  });
                                  const img = e.target as HTMLImageElement;
                                  const fallback = img.nextElementSibling as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = "none";
                                  }
                                }}
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-[#6b6b6b]/50 animate-pulse z-0" />
                            </>
                          ) : (
                            <div className="w-full h-full bg-[#6b6b6b]/50" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[#F6F6F6]">{s.title}</div>
                          <div className="truncate text-xs text-[#F6F6F6]/60">{s.artist}</div>
                        </div>
                        <div className="w-12 text-right text-sm text-[#F6F6F6]/70 tabular-nums">
                          {s.duration}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {q && songs.length === 0 && (
                <div className="px-8 pb-6 text-sm text-[#F6F6F6]/60">해당 검색어의 곡이 없습니다.</div>
              )}

              <div className="flex justify-center border-t border-[#464646] p-4 text-[#D9D9D9]">
                    <button
                    type="button"
                    onClick={() => navigate(`/search/song${search}`)}
                    aria-label="곡 더보기"
                    title="더보기"
                    className="text-xs text-[#f6f6f6]/40 hover:text-[#aaaaaa] transition"
                    >
                    더보기
                    </button>
                </div>
            </section>
          </div>
          </div>

          {/* ✅ 아티스트 미리보기 (MyPlaylistPage 가로 스크롤 카드 스타일) */}
          <SectionShell title="아티스트" onMore={() => navigate(`/search/artist${search}`)}>
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
              <div className="flex gap-4 min-w-max px-2">
                {(artists.length ? artists : ALL_ARTISTS).slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate(`/artists/${a.id}`)}
                    className="w-[220px] text-left group shrink-0"
                  >
                    <div className="w-[208px] h-[208px] ml-2 rounded-full bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition overflow-hidden relative">
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
                            className="w-full h-full object-cover relative z-10"
                            onError={(e) => {
                              console.error(`[SearchAll] ❌ 아티스트 이미지 로드 실패:`, {
                                name: a.name,
                                id: a.id,
                                image_url: a.image,
                              });
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                            onLoad={(e) => {
                              console.log(`[SearchAll] ✅ 아티스트 이미지 로드 성공:`, {
                                name: a.name,
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
                          <div className="absolute inset-0 bg-[#6b6b6b]/40 animate-pulse z-0" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-[#6b6b6b]/40" />
                      )}
                    </div>
                    <div className="mt-3 text-sm ml-2 font-semibold text-[#F6F6F6] truncate">{a.name}</div>
                    <div className="mt-1 text-xs ml-2 text-[#F6F6F6]/60 truncate">아티스트</div>
                  </button>
                ))}
              </div>
            </HorizontalScroller>

            {q && artists.length === 0 && !loading && (
              <div className="mt-3 text-sm text-[#F6F6F6]/60">해당 검색어의 아티스트가 없습니다.</div>
            )}
          </SectionShell>

          {/* ✅ 앨범 미리보기 (가로 스크롤 카드 스타일로 통일) */}
          <SectionShell title="앨범" onMore={() => navigate(`/search/album${search}`)}>
            {loading && albums.length === 0 ? (
              <div className="text-center text-[#999] py-8">앨범 정보를 불러오는 중...</div>
            ) : (
              <>
                <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
                  <div className="flex gap-2 min-w-max px-2">
                    {(albums.length ? albums : ALL_ALBUMS).slice(0, 10).map((a) => {
                      // API에서 가져온 앨범인지 확인
                      const apiAlbum = apiAlbums.find((aa) => aa.id === a.id);
                      const albumImage = apiAlbum?.album_image || null;

                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => navigate(`/album/${a.id}`)}
                          className="w-[220px] text-left group shrink-0"
                        >
                          <div className="w-48 h-48 rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition overflow-hidden relative">
                            {albumImage ? (
                              <>
                                <img
                                  src={
                                    albumImage.startsWith("http") || albumImage.startsWith("//")
                                      ? albumImage
                                      : API_BASE && albumImage.startsWith("/")
                                      ? `${API_BASE.replace("/api/v1", "")}${albumImage}`
                                      : albumImage
                                  }
                                  alt={a.name}
                                  className="w-full h-full object-cover relative z-10"
                                  onError={(e) => {
                                    console.error(`[SearchAll] ❌ 앨범 이미지 로드 실패:`, {
                                      title: a.name,
                                      id: a.id,
                                      image_url: albumImage,
                                    });
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                  onLoad={(e) => {
                                    console.log(`[SearchAll] ✅ 앨범 이미지 로드 성공:`, {
                                      title: a.name,
                                      id: a.id,
                                      image_url: albumImage,
                                    });
                                    const img = e.target as HTMLImageElement;
                                    const fallback = img.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = "none";
                                    }
                                  }}
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-[#6b6b6b]/40 animate-pulse z-0" />
                              </>
                            ) : (
                              <div className="w-full h-full bg-[#6b6b6b]/40" />
                            )}
                          </div>
                          <div className="mt-3 ml-1 text-sm font-semibold text-[#F6F6F6] truncate">
                            {a.name}
                          </div>
                          {a.artist && (
                            <div className="mt-1 ml-1 text-xs text-[#F6F6F6]/60 truncate">{a.artist}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </HorizontalScroller>

                {q && albums.length === 0 && !loading && (
                  <div className="mt-3 text-sm text-[#F6F6F6]/60">해당 검색어의 앨범이 없습니다.</div>
                )}
              </>
            )}
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
