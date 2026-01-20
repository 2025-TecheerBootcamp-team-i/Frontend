// src/pages/search/SearchHome.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdOutlineNavigateNext, MdPlayArrow } from "react-icons/md";
import axios from "axios";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

/* =====================
  Horizontal Scroller
===================== */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative mt-2">
      <div
        ref={ref}
        onScroll={update}
        className="overflow-x-auto overflow-y-hidden no-scrollbar"
      >
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

      {/* fade edges (keep) */}
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

/* =====================
  Types
===================== */
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
type Album = { id: string; name: string; artist: string; image?: string | null };

// 아티스트 상세 API 응답 타입
type ArtistDetail = {
  artist_id: number;
  artist_name: string;
  artist_image: string | null;
};

// 검색 API 응답 타입
type ApiSearchResult = {
  itunes_id: number;
  music_id?: number; // 실제 재생에 사용할 음악 ID
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

/* =====================
  UI Helpers (Skeleton/Empty)
===================== */
function SkeletonBox({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={["animate-pulse bg-white/10", className].join(" ")} />
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-[#F6F6F6]/55">{children}</div>;
}

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

/* =====================
  Main
===================== */
export default function SearchHome() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { playTracks } = usePlayer();

  const q = (sp.get("q") ?? "").trim();
  const search = q ? `?q=${encodeURIComponent(q)}` : "";

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  // API 데이터 상태
  const [apiSongs, setApiSongs] = useState<Song[]>([]);
  const [apiArtists, setApiArtists] = useState<Artist[]>([]);
  const [apiAlbums, setApiAlbums] = useState<ArtistAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [artistDetails, setArtistDetails] = useState<Record<number, ArtistDetail>>({});
  const [searchResults, setSearchResults] = useState<ApiSearchResult[]>([]); // 검색 결과 원본 데이터 저장

  // 아티스트 상세 정보 가져오기 (이미지 포함)
  const fetchArtistDetails = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;

      const detailsMap: Record<number, ArtistDetail> = {};

      try {
        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/`;
            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) return null;
            const data: ArtistDetail = await res.json();
            return { artistId, data };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(promises);
        results.forEach((r) => {
          if (r) detailsMap[r.artistId] = r.data;
        });

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
        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/albums/`;
            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) return null;
            const data: ArtistAlbum[] = await res.json();
            return { artistId, albums: data };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(promises);
        results.forEach((r) => {
          if (!r) return;
          r.albums.forEach((album) => {
            if (!seenAlbumIds.has(album.id)) {
              seenAlbumIds.add(album.id);
              allAlbums.push(album);
            }
          });
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
    // 검색어/BASE 없으면 초기화
    if (!API_BASE || !q.trim()) {
      setApiSongs([]);
      setApiArtists([]);
      setApiAlbums([]);
      setSearchResults([]);
      setArtistDetails({});
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          q,
          page_size: "100",
        });

        const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(`API 오류: ${res.status}`);

        const data: ApiSearchResponse = await res.json();
        setSearchResults(data.results);

        // 곡 변환
        const convertedSongs: Song[] = data.results.map((r) => ({
          id: String(r.itunes_id),
          title: r.music_name,
          artist: r.artist_name,
          duration: r.duration
            ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, "0")}`
            : "0:00",
          albumId: r.album_id,
          artistId: r.artist_id,
          albumName: r.album_name,
        }));

        // 아티스트 중복 제거
        const artistMap = new Map<number, Artist>();
        data.results.forEach((r) => {
          if (r.artist_id && !artistMap.has(r.artist_id)) {
            artistMap.set(r.artist_id, { id: String(r.artist_id), name: r.artist_name });
          }
        });

        setApiSongs(convertedSongs);
        setApiArtists(Array.from(artistMap.values()));

        // 고유 artist_id
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
        } else {
          setApiAlbums([]);
          setArtistDetails({});
        }
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("[SearchAll] 검색 API 오류:", e);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, q, fetchArtistAlbums, fetchArtistDetails]);

  /* =====================
    Derived data (NO dummy)
  ===================== */
  const songs = useMemo(() => {
    if (!API_BASE || !q.trim()) return [];
    return apiSongs;
  }, [API_BASE, q, apiSongs]);

  const artists = useMemo(() => {
    if (!API_BASE || !q.trim()) return [];
    return apiArtists.map((artist) => {
      const detail = artistDetails[Number(artist.id)];
      return { ...artist, image: detail?.artist_image || null };
    });
  }, [API_BASE, q, apiArtists, artistDetails]);

  const albums = useMemo<Album[]>(() => {
    if (!API_BASE || !q.trim()) return [];
    return apiAlbums.map((a) => ({
      id: a.id,
      name: a.title,
      artist: "",
      image: a.album_image,
    }));
  }, [API_BASE, q, apiAlbums]);

  // 상위 결과: 아티스트 정확일치 > 아티스트 > 곡
  const featured = useMemo(() => {
    if (!API_BASE || !q.trim()) return null;

    const searchLower = q.toLowerCase().trim();

    const exactArtistMatch = artists.find(
      (a) => a.name.toLowerCase().trim() === searchLower
    );
    if (exactArtistMatch) return { type: "artist" as const, data: exactArtistMatch };

    if (artists.length > 0) return { type: "artist" as const, data: artists[0] };
    if (songs.length > 0) return { type: "song" as const, data: songs[0] };

    return null;
  }, [API_BASE, q, artists, songs]);

  const hasQuery = !!q.trim();
  const canUseApi = !!API_BASE;

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <div className="space-y-4">
          {/* 검색어 없거나 API_BASE 없을 때 안내 */}
          {(!hasQuery || !canUseApi) && (
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] p-8">
              <div className="text-lg font-semibold text-[#F6F6F6]">
                {canUseApi ? "검색어를 입력해주세요" : "API_BASE 설정이 필요해"}
              </div>
              <div className="mt-2 text-sm text-[#F6F6F6]/60">
                {canUseApi
                  ? "상단 검색창에 키워드를 입력하면 곡/아티스트/앨범 결과를 볼 수 있습니다."
                  : "VITE_API_BASE_URL 환경변수를 설정해야 검색 API를 호출할 수 있습니다."}
              </div>
            </section>
          )}

          {/* ✅ 상단 2열 */}
          <div className="overflow-x-auto">
            <div className="grid gap-4 grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)] min-w-[920px]">
              {/* 대표 카드 */}
              <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
                <div className="px-8 pt-6 pb-2 flex items-center justify-between">
                  <div className="text-lg font-semibold text-[#F6F6F6]">상위 결과</div>
                </div>

                <div className="mx-4 border-b border-[#464646]" />

                <div className="p-4">
                  <div
                    className="
                      group relative
                      h-full w-full
                      rounded-3xl
                      hover:bg-[#1d1d1d]/45 transition
                      p-4
                    "
                  >
                    {/* Skeleton */}
                    {loading && hasQuery ? (
                      <div className="flex flex-col">
                        <SkeletonBox className="w-[228px] h-[228px] rounded-2xl" />
                        <SkeletonBox className="mt-5 h-5 w-44 rounded-md" />
                        <SkeletonBox className="mt-2 h-4 w-28 rounded-md" />
                      </div>
                    ) : !featured ? (
                      <div className="flex flex-col">
                        <div className="w-[228px] h-[228px] bg-white/10 rounded-2xl" />
                        <div className="mt-5 min-w-0">
                          <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                            {hasQuery ? "검색 결과 없음" : "검색어를 입력해주세요"}
                          </div>
                          <div className="mt-1 text-sm text-[#F6F6F6]/60 truncate">
                            {hasQuery ? "다른 키워드로 다시 검색해주세요" : "상단 검색창에 검색어를 입력해보세요"}
                          </div>
                        </div>
                      </div>
                    ) : (() => {
                        const isArtist = featured.type === "artist";
                        const artistData = isArtist ? featured.data : null;
                        const songData = !isArtist ? featured.data : null;

                        // 곡일 때 앨범 이미지 찾기 (검색 결과 원본에서 album_image 우선)
                        let songAlbumImage: string | null = null;
                        if (!isArtist && songData) {
                          const original = searchResults.find((r) => String(r.itunes_id) === songData.id);
                          songAlbumImage = original?.album_image || null;
                          if (!songAlbumImage) {
                            const apiSong = apiSongs.find((as) => as.id === songData.id);
                            if (apiSong?.albumId) {
                              const album = apiAlbums.find((a) => a.id === String(apiSong.albumId));
                              songAlbumImage = album?.album_image || null;
                            }
                          }
                        }

                        const resolveImage = (url: string) => {
                          if (url.startsWith("http") || url.startsWith("//")) return url;
                          if (API_BASE && url.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${url}`;
                          return url;
                        };

                        return (
                          <div className="flex flex-col">
                            <div
                              className={[
                                "w-[228px] h-[228px] bg-white/10 relative overflow-hidden",
                                isArtist ? "rounded-full" : "rounded-2xl",
                              ].join(" ")}
                            >
                              {isArtist && artistData?.image ? (
                                <img
                                  src={resolveImage(artistData.image)}
                                  alt={artistData.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : !isArtist && songData && songAlbumImage ? (
                                <img
                                  src={resolveImage(songAlbumImage)}
                                  alt={songData.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-white/10" />
                              )}
                            </div>

                            <div className="mt-5 min-w-0">
                              <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                                {isArtist ? artistData?.name : songData?.title}
                              </div>
                              <div className="mt-1 text-sm text-[#F6F6F6]/60 truncate">
                                {isArtist ? "아티스트" : songData?.artist}
                              </div>
                            </div>

                            {/* ▶ 재생 버튼 */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();

                                if (!API_BASE) return;

                                if (isArtist && artistData) {
                                  // 검색 결과에서 해당 아티스트 곡들 재생
                                  try {
                                    const artistIdNum = Number(artistData.id);
                                    if (Number.isNaN(artistIdNum)) return;

                                    const artistSongs = searchResults.filter(
                                      (r) => r.artist_id === artistIdNum
                                    );

                                    if (artistSongs.length === 0) return;

                                    const resolveCover = (maybeUrl: string | null) => {
                                      if (!maybeUrl) return undefined;
                                      if (maybeUrl.startsWith("http") || maybeUrl.startsWith("//")) return maybeUrl;
                                      if (maybeUrl.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${maybeUrl}`;
                                      return maybeUrl;
                                    };

                                    const playerTracks: PlayerTrack[] = await Promise.all(
                                      artistSongs.map(async (r) => {
                                        let audioUrl = r.audio_url;
                                        const musicId = r.music_id;

                                        if (!audioUrl && musicId) {
                                          try {
                                            const playRes = await axios.get<{ audio_url: string }>(
                                              `${API_BASE}/tracks/${musicId}/play`,
                                              { headers: { "Content-Type": "application/json" } }
                                            );
                                            audioUrl = playRes.data.audio_url;
                                          } catch (err) {
                                            console.error("[SearchAll] track play url fail:", err);
                                          }
                                        }

                                        const coverUrl =
                                          resolveCover(r.album_image) ||
                                          (r.album_id
                                            ? resolveCover(
                                                apiAlbums.find((a) => a.id === String(r.album_id))?.album_image ?? null
                                              )
                                            : undefined);

                                        return {
                                          id: String(r.itunes_id),
                                          title: r.music_name,
                                          artist: r.artist_name,
                                          album: r.album_name || "",
                                          duration: r.duration
                                            ? `${Math.floor(r.duration / 60)}:${(r.duration % 60)
                                                .toString()
                                                .padStart(2, "0")}`
                                            : "0:00",
                                          audioUrl: audioUrl || undefined,
                                          coverUrl,
                                          musicId: musicId || undefined,
                                          albumId: r.album_id ?? null,
                                        };
                                      })
                                    );

                                    const validTracks = playerTracks.filter((t) => t.audioUrl);
                                    if (validTracks.length > 0) playTracks(validTracks);
                                  } catch (err) {
                                    console.error("[SearchAll] artist play error:", err);
                                  }
                                } else if (!isArtist && songData) {
                                  // 단일 곡 재생
                                  try {
                                    const original = searchResults.find((r) => String(r.itunes_id) === songData.id);
                                    let audioUrl: string | undefined = original?.audio_url || undefined;

                                    // music_id 있으면 바로 play 호출 가능
                                    const musicId: number | null = original?.music_id ?? null;

                                    // audio_url 없고 music_id 있으면 /play
                                    if (!audioUrl && musicId) {
                                      const playRes = await axios.get<{ audio_url: string }>(
                                        `${API_BASE}/tracks/${musicId}/play`,
                                        { headers: { "Content-Type": "application/json" } }
                                      );
                                      audioUrl = playRes.data.audio_url;
                                    }

                                    if (!audioUrl) return;

                                    const coverUrl = original?.album_image
                                      ? (original.album_image.startsWith("http") || original.album_image.startsWith("//")
                                          ? original.album_image
                                          : original.album_image.startsWith("/")
                                          ? `${API_BASE.replace("/api/v1", "")}${original.album_image}`
                                          : original.album_image)
                                      : undefined;

                                    const playerTrack: PlayerTrack = {
                                      id: songData.id,
                                      title: songData.title,
                                      artist: songData.artist,
                                      album: songData.albumName || "",
                                      duration: songData.duration,
                                      audioUrl,
                                      coverUrl,
                                      musicId: musicId || undefined,
                                      albumId: original?.album_id ?? null,
                                    };

                                    playTracks([playerTrack]);
                                  } catch (err) {
                                    console.error("[SearchAll] song play error:", err);
                                  }
                                }
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
                          </div>
                        );
                      })()}
                  </div>
                </div>
              </section>

              {/* 곡 리스트 카드 */}
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

                <div className="px-4">
                  {/* Skeleton list */}
                  {loading && hasQuery ? (
                    <div className="py-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-full px-2 py-3 border-b border-[#464646] last:border-b-0"
                        >
                          <div className="flex items-center gap-4">
                            <SkeletonBox className="h-12 w-12 rounded-xl" />
                            <div className="min-w-0 flex-1">
                              <SkeletonBox className="h-4 w-48 rounded-md" />
                              <SkeletonBox className="mt-2 h-3 w-28 rounded-md" />
                            </div>
                            <SkeletonBox className="h-4 w-10 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : songs.length === 0 ? (
                    <div className="px-4 py-6">
                      <EmptyText>
                        {hasQuery ? "해당 검색어의 곡이 없습니다." : "검색어를 입력하면 곡이 표시됩니다."}
                      </EmptyText>
                    </div>
                  ) : (
                    songs.slice(0, 4).map((s) => {
                      const original = searchResults.find((r) => String(r.itunes_id) === s.id);
                      const albumImage =
                        original?.album_image ||
                        (original?.album_id
                          ? apiAlbums.find((a) => a.id === String(original.album_id))?.album_image ?? null
                          : null);

                      const resolveImage = (url: string) => {
                        if (url.startsWith("http") || url.startsWith("//")) return url;
                        if (API_BASE && url.startsWith("/"))
                          return `${API_BASE.replace("/api/v1", "")}${url}`;
                        return url;
                      };

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate(`/search/song${search}`)}
                          className="w-full text-left px-2 py-3 hover:bg-white/5 transition border-b border-[#464646] last:border-b-0"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/10 overflow-hidden relative flex-shrink-0">
                              {albumImage ? (
                                <img
                                  src={resolveImage(albumImage)}
                                  alt={s.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-white/10" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[#F6F6F6]">
                                {s.title}
                              </div>
                              <div className="truncate text-xs text-[#F6F6F6]/60">
                                {s.artist}
                              </div>
                            </div>
                            <div className="w-12 text-right text-sm text-[#F6F6F6]/70 tabular-nums">
                              {s.duration}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-center border-t border-[#464646] p-4 text-[#D9D9D9]">
                  <button
                    type="button"
                    onClick={() => navigate(`/search/song${search}`)}
                    aria-label="곡 더보기"
                    title="더보기"
                    className="text-xs text-[#f6f6f6]/40 hover:text-[#aaaaaa] transition"
                    disabled={!hasQuery}
                  >
                    더보기
                  </button>
                </div>
              </section>
            </div>
          </div>

          {/* ✅ 아티스트 */}
          <SectionShell title="아티스트" onMore={() => navigate(`/search/artist${search}`)}>
            {loading && hasQuery ? (
              <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
                <div className="flex gap-4 min-w-max px-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-[220px] text-left shrink-0">
                      <SkeletonBox className="w-[208px] h-[208px] ml-2 rounded-full" />
                      <SkeletonBox className="mt-3 ml-2 h-4 w-32 rounded-md" />
                      <SkeletonBox className="mt-2 ml-2 h-3 w-16 rounded-md" />
                    </div>
                  ))}
                </div>
              </HorizontalScroller>
            ) : artists.length === 0 ? (
              <div className="px-2">
                <EmptyText>
                  {hasQuery ? "해당 검색어의 아티스트가 없습니다." : "검색어를 입력하면 아티스트가 표시됩니다."}
                </EmptyText>
              </div>
            ) : (
              <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
                <div className="flex gap-4 min-w-max px-2">
                  {artists.slice(0, 8).map((a) => {
                    const resolveImage = (url: string) => {
                      if (url.startsWith("http") || url.startsWith("//")) return url;
                      if (API_BASE && url.startsWith("/"))
                        return `${API_BASE.replace("/api/v1", "")}${url}`;
                      return url;
                    };

                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => navigate(`/artists/${a.id}`)}
                        className="w-[220px] text-left group shrink-0"
                      >
                        <div className="w-[208px] h-[208px] ml-2 rounded-full bg-white/10 transition overflow-hidden relative">
                          {a.image ? (
                            <img
                              src={resolveImage(a.image)}
                              alt={a.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10" />
                          )}
                        </div>
                        <div className="mt-3 text-sm ml-2 font-semibold text-[#F6F6F6] truncate">
                          {a.name}
                        </div>
                        <div className="mt-1 text-xs ml-2 text-[#F6F6F6]/60 truncate">
                          아티스트
                        </div>
                      </button>
                    );
                  })}
                </div>
              </HorizontalScroller>
            )}
          </SectionShell>

          {/* ✅ 앨범 */}
          <SectionShell title="앨범" onMore={() => navigate(`/search/album${search}`)}>
            {loading && hasQuery ? (
              <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
                <div className="flex gap-2 min-w-max px-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-[220px] text-left shrink-0">
                      <SkeletonBox className="w-48 h-48 rounded-2xl" />
                      <SkeletonBox className="mt-3 ml-1 h-4 w-36 rounded-md" />
                    </div>
                  ))}
                </div>
              </HorizontalScroller>
            ) : albums.length === 0 ? (
              <div className="px-2">
                <EmptyText>
                  {hasQuery ? "해당 검색어의 앨범이 없습니다." : "검색어를 입력하면 앨범이 표시됩니다."}
                </EmptyText>
              </div>
            ) : (
              <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
                <div className="flex gap-2 min-w-max px-2">
                  {albums.slice(0, 10).map((a) => {
                    const resolveImage = (url: string) => {
                      if (url.startsWith("http") || url.startsWith("//")) return url;
                      if (API_BASE && url.startsWith("/"))
                        return `${API_BASE.replace("/api/v1", "")}${url}`;
                      return url;
                    };

                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => navigate(`/album/${a.id}`)}
                        className="w-[220px] text-left group shrink-0"
                      >
                        <div className="w-48 h-48 rounded-2xl bg-white/10 transition overflow-hidden relative">
                          {a.image ? (
                            <img
                              src={resolveImage(a.image)}
                              alt={a.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10" />
                          )}
                        </div>
                        <div className="mt-3 ml-1 text-sm font-semibold text-[#F6F6F6] truncate">
                          {a.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </HorizontalScroller>
            )}
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
