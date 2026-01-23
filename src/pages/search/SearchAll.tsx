// src/pages/search/SearchHome.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

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
  gradientFromClass = "from-transparent",
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
            h-10 w-10 rounded-full
            bg-black/50 backdrop-blur-md text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-black/70 transition-all border border-white/10
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
            h-10 w-10 rounded-full
            bg-black/50 backdrop-blur-md text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-black/70 transition-all border border-white/10
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

type ArtistDetail = {
  artist_id: number;
  artist_name: string;
  artist_image: string | null;
};

type ApiSearchResult = {
  itunes_id: number;
  music_id?: number;
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
  results: ApiSearchResult[];
};

type ArtistAlbum = {
  id: string;
  title: string;
  year: string;
  album_image: string | null;
  image_large_square: string | null;
};

type Playlist = { id: string; title: string; owner: string; image?: string | null; trackCount?: number };

const DUMMY_PLAYLISTS: Playlist[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  title:
    i % 3 === 0
      ? `#christmas playlist ${i + 1}`
      : i % 3 === 1
      ? `감성 플리 ${i + 1}`
      : `공부할 때 듣는 플리 ${i + 1}`,
  owner: `user_${(i % 5) + 1}`,
  image: null,
  trackCount: 10 + i * 2,
}));

/* =====================
  UI Helpers
===================== */
function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={["animate-pulse bg-gradient-to-br from-white/5 to-transparent", className].join(" ")} />;
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
    <section className="rounded-[40px] bg-white/[0.03] backdrop-blur-md border border-white/5 p-8 mb-10 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2
          onClick={onMore}
          className="text-3xl font-black tracking-tighter text-white uppercase cursor-pointer hover:text-[#AFDEE2] transition-colors"
        >
          {title}
        </h2>

        <button
          type="button"
          onClick={onMore}
          className="p-3 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <MdOutlineNavigateNext size={24} />
        </button>
      </div>
      <div>{children}</div>
    </section>
  );
}

/* =====================
  Main
===================== */
export default function SearchHome() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { setTrackAndPlay } = usePlayer();

  const q = (sp.get("q") ?? "").trim();
  const search = q ? `?q=${encodeURIComponent(q)}` : "";

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  const [apiSongs, setApiSongs] = useState<Song[]>([]);
  const [apiArtists, setApiArtists] = useState<Artist[]>([]);
  const [apiAlbums, setApiAlbums] = useState<ArtistAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [artistDetails, setArtistDetails] = useState<Record<number, ArtistDetail>>({});
  const [searchResults, setSearchResults] = useState<ApiSearchResult[]>([]);

  const fetchArtistDetails = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;
      const detailsMap: Record<number, ArtistDetail> = {};
      try {
        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data: ArtistDetail = await res.json();
            return { artistId, data };
          } catch { return null; }
        });
        const results = await Promise.all(promises);
        results.forEach((r) => { if (r) detailsMap[r.artistId] = r.data; });
        setArtistDetails(detailsMap);
      } catch (e) { console.error(e); }
    },
    [API_BASE]
  );

  const fetchArtistAlbums = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;
      const allAlbums: ArtistAlbum[] = [];
      const seenAlbumIds = new Set<string>();
      try {
        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/albums/`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data: ArtistAlbum[] = await res.json();
            return { artistId, albums: data };
          } catch { return null; }
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
      } catch (e) { console.error(e); }
    },
    [API_BASE]
  );

  useEffect(() => {
    if (!API_BASE || !q.trim()) {
      setApiSongs([]); setApiArtists([]); setApiAlbums([]); setSearchResults([]); setArtistDetails({});
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ q, page_size: "30" });
        const res = await fetch(`${API_BASE}/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`API 오류: ${res.status}`);
        const data: ApiSearchResponse = await res.json();
        setSearchResults(data.results);
        const convertedSongs: Song[] = data.results.map((r) => ({
          id: String(r.itunes_id),
          title: r.music_name,
          artist: r.artist_name,
          duration: r.duration ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, "0")}` : "0:00",
          albumId: r.album_id,
          artistId: r.artist_id,
          albumName: r.album_name,
        }));
        const artistMap = new Map<number, Artist>();
        data.results.forEach((r) => {
          if (r.artist_id && !artistMap.has(r.artist_id)) {
            artistMap.set(r.artist_id, { id: String(r.artist_id), name: r.artist_name });
          }
        });
        setApiSongs(convertedSongs);
        setApiArtists(Array.from(artistMap.values()));
        const uniqueArtistIds = Array.from(new Set(data.results.map((r) => r.artist_id).filter((id): id is number => id !== null))).slice(0, 8);
        if (uniqueArtistIds.length > 0) {
          await Promise.all([fetchArtistAlbums(uniqueArtistIds), fetchArtistDetails(uniqueArtistIds)]);
        }
      } catch (e: unknown) { if ((e as DOMException)?.name !== "AbortError") console.error(e); } finally { setLoading(false); }
    })();
    return () => controller.abort();
  }, [API_BASE, q, fetchArtistAlbums, fetchArtistDetails]);

  const artists = useMemo(() => apiArtists.map(a => ({ ...a, image: artistDetails[Number(a.id)]?.artist_image || null })), [apiArtists, artistDetails]);
  const albums = useMemo<Album[]>(() => apiAlbums.map(a => ({ id: a.id, name: a.title, artist: "", image: a.image_large_square || a.album_image })), [apiAlbums]);

  const featured = useMemo(() => {
    if (!q.trim()) return null;
    const lower = q.toLowerCase().trim();
    const exact = artists.find(a => a.name.toLowerCase().trim() === lower);
    if (exact) return { type: "artist" as const, data: exact };
    if (artists.length > 0) return { type: "artist" as const, data: artists[0] };
    if (apiSongs.length > 0) return { type: "song" as const, data: apiSongs[0] };
    return null;
  }, [q, artists, apiSongs]);

  const resolveImage = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("//")) return url;
    if (API_BASE && url.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${url}`;
    return url;
  };

  const toTrack = (r: ApiSearchResult): PlayerTrack => {
    return {
      id: String(r.itunes_id),
      musicId: r.music_id || r.itunes_id,
      title: r.music_name,
      artist: r.artist_name,
      coverUrl: r.album_image || "",
      audioUrl: r.audio_url || "/audio/sample.mp3",
      duration: r.duration ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, "0")}` : "0:00",
    };
  };

  return (
    <div className="w-full min-w-0 h-full flex flex-col p-8 font-sans">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="space-y-10">
          {!q.trim() && (
            <section className="rounded-[40px] bg-white/[0.03] backdrop-blur-md border border-white/5 p-12 text-center">
              <div className="text-3xl font-black tracking-tighter text-white uppercase mb-4">검색할 준비가 되셨나요?</div>
              <p className="text-white/40 font-light tracking-wide">노래, 아티스트 또는 앨범을 입력하여 취향을 찾아보세요.</p>
            </section>
          )}

          <div className="grid gap-8 grid-cols-[380px_1fr] items-start">
            <section className="rounded-[40px] bg-white/[0.03] backdrop-blur-md border border-white/5 p-8 overflow-hidden h-full">
              <h2 className="text-xl font-black tracking-tighter text-white uppercase mb-8">상위 결과</h2>
              <div className="group relative">
                {loading ? (
                  <div className="flex flex-col">
                    <SkeletonBox className="w-full aspect-square rounded-[32px]" />
                    <SkeletonBox className="mt-6 h-6 w-48 rounded-lg" />
                    <SkeletonBox className="mt-2 h-4 w-32 rounded-md" />
                  </div>
                ) : !featured ? (
                  <div className="flex flex-col opacity-20">
                    <div className="w-full aspect-square bg-white/5 rounded-[32px]" />
                    <div className="mt-6 h-6 w-48 bg-white/10 rounded-lg" />
                  </div>
                ) : (() => {
                  const isArtist = featured.type === "artist";
                  const data = featured.data;
                  const r = searchResults.find(x => String(x.itunes_id) === data.id);
                  let img = isArtist ? (data as Artist).image : r?.album_image;

                  return (
                    <div className="flex flex-col transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.02] relative">
                      <div className={["relative aspect-square overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_2px_10px_rgba(255,255,255,0.2)] transition-all duration-700 ease-out backdrop-blur-xl", isArtist ? "rounded-full scale-95 group-hover:scale-105 border border-white/20 group-hover:border-white/40" : "rounded-[40px] border border-white/10 group-hover:border-white/20"].join(" ")}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />
                        {img ? (
                          <>
                            <img 
                              src={resolveImage(img)} 
                              alt="" 
                              className={["absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 brightness-95 group-hover:brightness-110", isArtist ? "opacity-80 group-hover:opacity-100" : ""].join(" ")} 
                            />
                            {isArtist && (
                              <>
                                {/* 유리구슬 효과 레이어들 */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                                <div className="absolute top-[8%] left-[15%] w-[40%] h-[20%] bg-gradient-to-b from-white/40 to-transparent rounded-[100%] rotate-[-15deg] blur-[2px] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-[5%] right-[10%] w-[30%] h-[15%] bg-white/20 blur-[8px] rounded-full pointer-events-none" />
                              </>
                            )}
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-white/5 font-black text-4xl">?</div>
                        )}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                      </div>
                      <div className="mt-8 px-2">
                        <div className="text-2xl font-black tracking-tighter text-white truncate">{isArtist ? (data as Artist).name : (data as Song).title}</div>
                        <div className="mt-1 text-xs font-black tracking-[0.2em] text-white/30 uppercase">{isArtist ? "아티스트" : (data as Song).artist}</div>
                      </div>

                      {/* ▶ 재생 버튼 (오른쪽 하단으로 이동) */}
                      {!isArtist && r && (
                        <div 
                          className="absolute right-2 bottom-2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackAndPlay(toTrack(r));
                          }}
                        >
                          <div className="w-14 h-14 rounded-full bg-[#AFDEE2] text-[#1d1d1d] flex items-center justify-center shadow-[0_8px_24px_rgba(175,222,226,0.4)] hover:scale-110 active:scale-95 transition-all">
                            <FaPlay size={20} className="ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </section>

            <section className="rounded-[40px] bg-white/[0.03] backdrop-blur-md border border-white/5 p-8 h-full antialiased">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-[0.15em] text-white uppercase opacity-90">곡</h2>
                <button onClick={() => navigate(`/search/song${search}`)} className="p-2 rounded-full hover:bg-white/5 text-white/40 transition-all"><MdOutlineNavigateNext size={24} /></button>
              </div>
              <div className="space-y-1">
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3"><SkeletonBox className="h-12 w-12 rounded-xl" /><div className="flex-1"><SkeletonBox className="h-4 w-48 mb-2" /><SkeletonBox className="h-3 w-32" /></div></div>
                )) : apiSongs.length === 0 ? <div className="py-12 text-center text-white/20 font-light tracking-widest uppercase">검색된 곡이 없습니다</div>
                : apiSongs.slice(0, 4).map(s => {
                  const r = searchResults.find(x => String(x.itunes_id) === s.id);
                  return (
                    <div 
                      key={s.id} 
                      className="group flex items-center gap-5 p-3 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-white/5"
                      onClick={() => r && setTrackAndPlay(toTrack(r))}
                    >
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/5 relative flex-shrink-0 shadow-lg border border-white/5">
                        <img src={resolveImage(r?.album_image || "")} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-white/95 truncate tracking-tight group-hover:text-[#AFDEE2] transition-colors">{s.title}</div>
                        <div className="text-[11px] font-medium text-white/30 truncate tracking-wide mt-0.5">{s.artist}</div>
                      </div>
                      <div className="text-[11px] font-medium text-white/20 tabular-nums">{s.duration}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <SectionShell title="아티스트" onMore={() => navigate(`/search/artist${search}`)}>
            <HorizontalScroller>
              <div className="flex gap-8 px-2">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-44"><SkeletonBox className="w-44 h-44 rounded-full" /><SkeletonBox className="mt-4 h-4 w-32 mx-auto" /></div>
                )) : artists.length === 0 ? <div className="py-12 text-center w-full text-white/20 font-light tracking-widest uppercase">검색된 아티스트가 없습니다</div>
                : artists.slice(0, 8).map(a => (
                  <button key={a.id} onClick={() => navigate(`/artists/${a.id}`)} className="group w-44 text-center shrink-0">
                    <div className="relative w-44 h-44 rounded-full overflow-hidden bg-white/5 transition-all duration-700 ease-out group-hover:-translate-y-3 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(175,222,226,0.2)] border border-white/20 group-hover:border-white/40 backdrop-blur-xl shadow-[inset_0_2px_10px_rgba(255,255,255,0.2),0_10px_20px_rgba(0,0,0,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />
                      {a.image && (
                        <>
                          <img 
                            src={resolveImage(a.image)} 
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 opacity-80 group-hover:opacity-100 brightness-95 group-hover:brightness-110" 
                            alt="" 
                          />
                          {/* 유리구슬 효과 레이어들 */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                          <div className="absolute top-[8%] left-[15%] w-[40%] h-[20%] bg-gradient-to-b from-white/40 to-transparent rounded-[100%] rotate-[-15deg] blur-[2px] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-[5%] right-[10%] w-[30%] h-[15%] bg-white/20 blur-[8px] rounded-full pointer-events-none" />
                        </>
                      )}
                    </div>
                    <div className="mt-5 text-sm font-bold text-white truncate tracking-tight group-hover:text-[#AFDEE2] transition-colors">{a.name}</div>
                    <div className="mt-1 text-[10px] font-light text-white/30 tracking-widest uppercase">아티스트</div>
                  </button>
                ))}
              </div>
            </HorizontalScroller>
          </SectionShell>

          <SectionShell title="앨범" onMore={() => navigate(`/search/album${search}`)}>
            <HorizontalScroller>
              <div className="flex gap-8 px-2">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-48"><SkeletonBox className="w-48 h-48 rounded-[32px]" /><SkeletonBox className="mt-4 h-4 w-36" /></div>
                )) : albums.length === 0 ? <div className="py-12 text-center w-full text-white/20 font-light tracking-widest uppercase">검색된 앨범이 없습니다</div>
                : albums.slice(0, 10).map(a => (
                  <button key={a.id} onClick={() => navigate(`/album/${a.id}`)} className="group w-48 text-left shrink-0">
                    <div className="relative w-48 h-48 rounded-[32px] overflow-hidden bg-white/5 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(175,222,226,0.1)] border border-white/5 group-hover:border-white/20">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />
                      {a.image && <img src={resolveImage(a.image)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <FaPlay className="text-white/80 scale-75 group-hover:scale-100 transition-transform duration-500" size={32} />
                      </div>
                    </div>
                    <div className="mt-5 text-sm font-bold text-white truncate tracking-tight group-hover:text-[#AFDEE2] transition-colors">{a.name}</div>
                    <div className="mt-1 text-[10px] font-light text-white/30 tracking-widest uppercase">앨범</div>
                  </button>
                ))}
              </div>
            </HorizontalScroller>
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
