import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdFavorite, MdAutoAwesome, MdQueueMusic, MdClose } from "react-icons/md";
import {
    MdPlayArrow,
    MdPause,
    MdSkipNext,
    MdSkipPrevious,
    MdShuffle,
    MdRepeat,
} from "react-icons/md";
import { RiDashboardFill } from "react-icons/ri";
import { GrContract } from "react-icons/gr";
import { usePlayer } from "../../player/PlayerContext";
import {
    isTrackLiked,
    toggleTrackLike,
    subscribePlaylists,
} from "../../mocks/playlistMock";
import { getBestAlbumCover } from "../../api/album";

// ✅ NowPlayingPage.tsx 상단 (import 아래) — 1번만 주입되는 이퀄라이저 CSS
let __npEqStyleInjected = false;
function ensureNowPlayingEqStyle() {
    if (__npEqStyleInjected) return;
    __npEqStyleInjected = true;

    const style = document.createElement("style");
    style.setAttribute("data-nowplaying-eq", "true");
    style.innerHTML = `
        @keyframes np-eq-calm {
            0%   { transform: scaleY(0.22); opacity: .45; }
            25%  { transform: scaleY(0.38); opacity: .60; }
            50%  { transform: scaleY(0.30); opacity: .52; }
            75%  { transform: scaleY(0.48); opacity: .65; }
            100% { transform: scaleY(0.22); opacity: .45; }
            }

            .np-eq-bar {
            transform-origin: bottom;
            will-change: transform, opacity;
            }

    `;
    document.head.appendChild(style);
}


type LyricLine = { t: number; text: string; timestamp?: string | null };

// ✅ 검색 API 응답 타입 (SearchAll.tsx 기반 추정)
type SearchResult = {
    itunes_id: number;
    music_id?: number | null;
    album_id?: number | null;
    artist_name?: string | null;
    music_name?: string | null;
};

type SearchApiResponse = {
    results?: SearchResult[];
};

// ✅ 앨범 상세 응답 타입 (tracks 배열만 최소로 사용)
type AlbumTrack = { music_id?: number | null; music_name?: string | null };
type AlbumDetailResponse = { tracks?: AlbumTrack[] };

export default function NowPlayingPage() {
    ensureNowPlayingEqStyle();
  
    const navigate = useNavigate();
  
    // ✅ 먼저 PlayerContext에서 isPlaying을 꺼내야 함 (순서 중요)
    const {
      current,
      isPlaying,
      toggle,
      shuffleQueue,
      nextTrack,
      previousTrack,
      repeatMode,
      toggleRepeat,
    } = usePlayer();
  
    const hasTrack = !!current;
  
    // ✅ 재생 재시작 시 애니메이션 리셋용
    const [playSeq, setPlaySeq] = useState(0);
  
    useEffect(() => {
      // 곡이 있고 + 재생 시작될 때만 playSeq 증가
      if (hasTrack && isPlaying) setPlaySeq((v) => v + 1);
    }, [hasTrack, isPlaying, current?.id]);
  
    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
  
    // 이미지 URL 처리 함수
    const processImageUrl = useCallback((url: string | null | undefined): string | null => {
      if (!url) return null;
  
      const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  
      if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
        return url;
      }
      if (base && url.startsWith("/")) {
        return `${base.replace("/api/v1", "")}${url}`;
      }
      return url;
    }, []);

    // 메인 앨범 이미지 (image_large_square 우선, 없으면 coverUrl)
    const [mainAlbumImage, setMainAlbumImage] = useState<string | null>(null);

    // 선택된 트랙이 바뀔 때마다 앨범 상세를 조회해 더 큰 커버 이미지를 시도
    useEffect(() => {
        let cancelled = false;

        async function loadAlbumCover() {
            if (!current) {
                setMainAlbumImage(null);
                return;
            }

            // PlayerTrack에 저장된 albumId와 coverUrl을 기반으로 베스트 커버를 조회
            const albumId = (current as { albumId?: number | null }).albumId ?? null;
            const fallback = current.coverUrl ?? null;

            const best = await getBestAlbumCover(albumId, fallback);
            if (!cancelled) {
                setMainAlbumImage(best);
            }
        }

        loadAlbumCover();

        return () => {
            cancelled = true;
        };
    }, [current]);

    // ✅ 가사 패널 (bottom sheet)
    const [lyricsOpen, setLyricsOpen] = useState(false);

    // ✅ 가사 데이터 상태
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsError, setLyricsError] = useState<string | null>(null);

    // ✅ 가사 API 호출
    useEffect(() => {
        if (!current || !API_BASE) {
        setLyrics([]);
        setLyricsError(null);
        return;
        }

        const controller = new AbortController();

        (async () => {
        try {
            setLyricsLoading(true);
            setLyricsError(null);

            // ✅ current.musicId가 이미 있으면 바로 사용 (검색 불필요)
            let musicId: number | null = (current as { musicId?: number | null }).musicId ?? null;

            if (!musicId) {
            // current.id가 itunes_id일 수 있으므로, music_id를 찾아야 함
            const itunesId = Number(current.id);
            if (Number.isNaN(itunesId)) {
                console.warn(
                `[NowPlayingPage] 가사 API 호출 실패: current.id가 숫자가 아니고 musicId도 없습니다.`,
                { id: current.id, title: current.title }
                );
                setLyrics([]);
                setLyricsError(null);
                return;
            }

            // 1) 제목으로 검색해서 itunes_id 매칭 시도
            try {
                const searchUrl = `${API_BASE}/search?q=${encodeURIComponent(current.title)}`;
                const searchRes = await fetch(searchUrl, {
                method: "GET",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
                });

                if (searchRes.ok) {
                const searchData = (await searchRes.json()) as SearchApiResponse;

                const matchedResult = searchData.results?.find((r) => r.itunes_id === itunesId);

                if (matchedResult?.music_id) {
                    musicId = matchedResult.music_id ?? null;
                } else if (matchedResult?.album_id) {
                    // 2) music_id가 없으면 앨범 API를 통해 찾기
                    try {
                    const albumRes = await fetch(`${API_BASE}/albums/${matchedResult.album_id}/`, {
                        method: "GET",
                        signal: controller.signal,
                        headers: { "Content-Type": "application/json" },
                    });

                    if (albumRes.ok) {
                        const albumData = (await albumRes.json()) as AlbumDetailResponse;
                        const matchedTrack = albumData.tracks?.find(
                        (t) => t.music_name === current.title
                        );
                        if (matchedTrack?.music_id) {
                        musicId = matchedTrack.music_id ?? null;
                        }
                    }
                    } catch (err) {
                    if (err instanceof DOMException && err.name === "AbortError") return;
                    console.warn(`[NowPlayingPage] 앨범 API 호출 실패:`, err);
                    }
                }
                } else if (searchRes.status !== 404) {
                console.warn(`[NowPlayingPage] 검색 API 오류: ${searchRes.status}`);
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                console.warn(`[NowPlayingPage] 검색 API 호출 실패:`, err);
            }

            // 3) 여전히 못 찾으면 "아티스트 + 제목" 조합 검색
            if (!musicId) {
                try {
                const combinedSearch = `${current.artist} ${current.title}`;
                const combinedSearchUrl = `${API_BASE}/search?q=${encodeURIComponent(combinedSearch)}`;

                const combinedSearchRes = await fetch(combinedSearchUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (combinedSearchRes.ok) {
                    const combinedSearchData = (await combinedSearchRes.json()) as SearchApiResponse;

                    const matched = combinedSearchData.results?.find(
                    (r) => r.artist_name === current.artist && r.music_name === current.title
                    );

                    if (matched?.music_id) {
                    musicId = matched.music_id ?? null;
                    }
                }
                } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                console.warn(`[NowPlayingPage] 조합 검색 API 호출 실패:`, err);
                }
            }

            // 여전히 music_id를 찾지 못했으면 가사를 불러올 수 없음
            if (!musicId) {
                console.warn(`[NowPlayingPage] ⚠️ music_id를 찾을 수 없어 가사를 불러올 수 없습니다:`, {
                title: current.title,
                artist: current.artist,
                });
                setLyrics([]);
                setLyricsError(null);
                return;
            }
            }

            // 가사 API 호출: /api/v1/{music_id}/
            const lyricsUrl = `${API_BASE}/${musicId}/`;

            const res = await fetch(lyricsUrl, {
            method: "GET",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
            if (res.status === 404) {
                // 404: 트랙이 없거나 가사가 없는 경우 -> 빈 가사 처리
                setLyrics([]);
                setLyricsError(null);
                return;
            }
            throw new Error(`가사 API 오류: ${res.status}`);
            }

            const data = (await res.json()) as { lyrics?: unknown };

            let parsedLyrics: LyricLine[] = [];

            if (typeof data.lyrics === "string" && data.lyrics.trim()) {
            // 타임스탬프 형식: [00:00.56] 가사 텍스트
            const lines = data.lyrics.split(/\r?\n/).filter((line) => line.trim() !== "");

            parsedLyrics = lines.map((line) => {
                const timestampMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
                if (timestampMatch) {
                const minutes = parseInt(timestampMatch[1], 10);
                const seconds = parseInt(timestampMatch[2], 10);
                const centiseconds = parseInt(timestampMatch[3], 10);
                const timestampSeconds = minutes * 60 + seconds + centiseconds / 100;

                const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/, "").trim();

                return {
                    t: timestampSeconds,
                    text: text || line.trim(),
                    timestamp: timestampMatch[0],
                };
                }

                // 타임스탬프가 없는 경우
                return { t: 0, text: line.trim(), timestamp: null };
            });

            parsedLyrics = parsedLyrics
                .filter((l) => l.text.trim() !== "")
                .sort((a, b) => a.t - b.t);

            setLyrics(parsedLyrics);
            } else {
            // lyrics 필드가 없거나 다른 형식
            setLyrics([]);
            setLyricsError(null);
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;

            console.error(`[NowPlayingPage] ❌ 가사 로드 실패:`, {
            id: current?.id,
            title: current?.title,
            error: err,
            });
            setLyricsError(err instanceof Error ? err.message : "가사를 불러올 수 없습니다.");
            setLyrics([]);
        } finally {
            setLyricsLoading(false);
        }
        })();

        return () => controller.abort();
    }, [current, API_BASE]);

    // ✅ 좌 패널 상태
    const [leftOpen, setLeftOpen] = useState(false); // 분석 대시보드
    const [rightOpen, setRightOpen] = useState(false); // 재생목록

    // ✅ playlists 변화 감지(좋아요 count 반영용)
    const [plTick, setPlTick] = useState(0);
    useEffect(() => {
        const unsub = subscribePlaylists(() => setPlTick((v) => v + 1));
        return () => {
        // subscribePlaylists가 cleanup을 리턴하는 경우만 안전하게 호출
        if (typeof unsub === "function") unsub();
        };
    }, []);

    const liked = useMemo(() => {
        if (!current) return false;
        return isTrackLiked(current.id);
    }, [current, plTick]);

    const toggleLike = () => {
        if (!current) return;

        toggleTrackLike({
        id: current.id,
        title: current.title,
        artist: current.artist,
        album: current.album,
        duration: current.duration ?? "0:00",
        likeCount: current.likeCount ?? 0,
        });
    };

    const baseLikeCount = current?.likeCount ?? 0;
    const shownLikeCount = liked ? baseLikeCount + 1 : baseLikeCount;

    // ✅ push 레이아웃
    const LEFT_W = 400;
    const RIGHT_W = 340;

    const leftShift = leftOpen ? LEFT_W : 0;
    const rightShift = rightOpen ? RIGHT_W : 0;

    const toggleLeft = () => {
        setLeftOpen((v) => {
            const next = !v;
            if (next) setRightOpen(false);
            return next;
        });
    };

    const toggleRight = () => {
        setRightOpen((v) => {
            const next = !v;
            if (next) setLeftOpen(false);
            return next;
        });
    };

    const handleStartStation = () => {
        if (!current) return;
    };

    return (
        <div className="relative h-full w-full text-[#F6F6F6] overflow-hidden">
        
        {/* 본문 */}
        <div className="h-full relative">
            {/* 좌측 사이드 버튼 (Dashboard) - 두 번째 사진 위치 */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
                <button
                    type="button"
                    onClick={toggleLeft}
                    className={[
                        "w-10 h-24 rounded-r-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 border-l-0 flex items-center justify-center transition-all hover:bg-white/[0.08] shadow-lg group",
                        leftOpen ? "text-[#AFDEE2]" : "text-white/30 hover:text-white"
                    ].join(" ")}
                    aria-label="분석 대시보드 토글"
                >
                    <RiDashboardFill size={20} />
                </button>
            </div>

            {/* 우측 사이드 버튼 (Queue) - 두 번째 사진 위치 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
                <button
                    type="button"
                    onClick={toggleRight}
                    className={[
                        "w-10 h-24 rounded-l-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 border-r-0 flex items-center justify-center transition-all hover:bg-white/[0.08] shadow-lg group",
                        rightOpen ? "text-[#AFDEE2]" : "text-white/30 hover:text-white"
                    ].join(" ")}
                    aria-label="재생목록 토글"
                >
                    <MdQueueMusic size={22} />
                </button>
            </div>

            {/* 상단 우측 버튼 세트 (Like, Station, Contract) - 두 번째 사진 위치 */}
            <div className="absolute right-8 top-6 z-20 flex items-center gap-5">
                <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); toggleLike(); }}
                    className={[
                        "flex items-center gap-2 transition hover:opacity-80",
                        liked ? "text-[#AFDEE2]" : "text-white/60"
                    ].join(" ")}
                    title="좋아요"
                >
                    <MdFavorite size={24} />
                    <span className="text-sm font-bold tabular-nums">{shownLikeCount.toLocaleString()}</span>
                </button>

                <button 
                    type="button" 
                    onClick={handleStartStation} 
                    className="text-white/60 hover:text-white transition" 
                    title="스테이션 시작"
                >
                    <MdAutoAwesome size={24}/>
                </button>

                <button 
                    type="button" 
                    onClick={() => navigate(-1)} 
                    className="text-white/60 hover:text-white transition" 
                    title="축소하기"
                >
                    <GrContract size={20} />
                </button>
            </div>

            <div
            className="h-full transition-all duration-300 ease-out"
            style={{ marginLeft: leftShift, marginRight: rightShift }}
            >
            <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
                <div className="w-full max-w-[860px] flex flex-col items-center gap-6">
                    <div className="relative">
                        {hasTrack && (
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 820, height: 240, opacity: 0.75, zIndex: 0 }}>
                                <div className="w-full h-full flex items-end justify-center gap-[10px]">
                                    {Array.from({ length: 26 }).map((_, i) => {
                                        const eqActive = hasTrack && isPlaying;
                                        const dur = 1.6 + (i % 7) * 0.18;
                                        const delay = (i % 11) * 0.07;
                                        return (
                                            <div key={`${playSeq}-${i}`} className="np-eq-bar rounded-full" style={{ width: 12, height: 60 + (i % 6) * 28, background: "rgba(255,255,255,0.28)", animation: eqActive ? `np-eq-calm ${dur}s ease-in-out infinite` : "none", animationDelay: `${delay}s`, transform: eqActive ? undefined : "scaleY(0.22)", opacity: eqActive ? 0.55 : 0.25, transition: "transform 0.25s ease, opacity 0.25s ease" }} />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="w-[380px] aspect-square rounded-[40px] bg-white/10 overflow-hidden relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10">
                            {hasTrack && mainAlbumImage ? (
                                <img src={processImageUrl(mainAlbumImage)!} alt={current.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-white/20 font-black tracking-tighter text-4xl uppercase">No Cover</span></div>
                            )}
                        </div>
                    </div>

                    <div className="min-w-0 text-center space-y-2 mt-4">
                        <div className="text-3xl font-black text-white truncate tracking-tight drop-shadow-xl">{hasTrack ? current.title : "재생 중인 곡이 없어요"}</div>
                        <div className="text-lg font-medium text-white/40 truncate tracking-wide">{hasTrack ? current.artist : "—"}</div>
                    </div>

                    <button type="button" onClick={() => setLyricsOpen(true)} className="mt-8 px-6 py-2.5 rounded-full bg-white/5 border border-white/5 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all">전체 가사 보기</button>
                </div>
            </div>
            </div>

            {/* 기존 하단/사이드 토글 버튼들은 숨김 (사이드 버튼으로 대체됨) */}
        </div>

        {/* Lyrics Full Screen Overlay - 투명하게 꽉 차게 수정 */}
        <div className={["absolute inset-0 z-50 transition-all duration-500 flex flex-col", lyricsOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"].join(" ")}>
            {/* 배경 블러 처리 (메인 배경과 동일한 느낌 유지) */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[80px]" onClick={() => setLyricsOpen(false)} />
            
            <div className="relative flex-1 flex flex-col h-full">
                {/* 헤더 */}
                <div className="h-20 px-10 flex items-center justify-between border-b border-white/5">
                    <div className="min-w-0">
                        <div className="text-lg font-bold text-white/90 truncate">가사</div>
                        <div className="text-sm text-white/50 truncate">{hasTrack ? `${current.title} · ${current.artist}` : "—"}</div>
                    </div>
                    <button onClick={() => setLyricsOpen(false)} className="p-3 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"><MdClose size={28} /></button>
                </div>

                {/* 가사 본문 - 중앙 정렬 및 폰트 크기 확대 */}
                <div className="flex-1 overflow-y-auto px-10 py-20 no-scrollbar">
                    {lyricsLoading ? (
                        <div className="flex items-center justify-center h-full text-white/40">가사를 불러오는 중...</div>
                    ) : lyricsError ? (
                        <div className="flex items-center justify-center h-full text-white/40">{lyricsError}</div>
                    ) : lyrics.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-white/40">가사가 없습니다.</div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-10 text-center">
                            {lyrics.map((line, i) => (
                                <div key={`${line.t}-${i}`} className="text-3xl font-bold text-white/80 hover:text-white transition-colors cursor-default leading-relaxed">
                                    {line.text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 하단 컨트롤 바 - 투명하게 배치 */}
                <div className="p-10 bg-gradient-to-t from-black/40 to-transparent">
                    <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                        <div className="flex items-center gap-10">
                            <button onClick={shuffleQueue} className="text-white/40 hover:text-white transition"><MdShuffle size={24} /></button>
                            <button onClick={previousTrack} className="text-white/60 hover:text-white transition"><MdSkipPrevious size={36} /></button>
                            <button onClick={toggle} className="h-16 w-16 rounded-full bg-[#E4524D] text-white flex items-center justify-center hover:scale-105 transition shadow-xl">
                                {isPlaying ? <MdPause size={36} /> : <MdPlayArrow size={36} className="ml-1" />}
                            </button>
                            <button onClick={nextTrack} className="text-white/60 hover:text-white transition"><MdSkipNext size={36} /></button>
                            <button onClick={toggleRepeat} className={repeatMode === "one" ? "text-[#AFDEE2]" : "text-white/40 hover:text-white transition"}><MdRepeat size={24} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}
