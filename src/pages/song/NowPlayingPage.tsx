import { useMemo, useState, useEffect, useCallback } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MdFavorite, MdAutoAwesome } from "react-icons/md";
import { MdQueueMusic, MdClose, MdDelete, MdDragIndicator } from "react-icons/md";
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
import { isTrackLiked, toggleTrackLike, subscribePlaylists } from "../../mocks/playlistMock";
import { getBestAlbumCover } from "../../api/album";
import { getMusicDetail, type MusicDetailResponse } from "../../api/music";

function to01(v: unknown): number {
    const n =
        typeof v === "number" ? v :
        typeof v === "string" ? Number(v) :
        NaN;
    
    if (!Number.isFinite(n)) return 0;
    // 혹시 백엔드가 0~100으로 주는 경우 대비
    const scaled = n > 1 ? n / 100 : n;
    return Math.max(0, Math.min(1, scaled));
}


// ✅ NowPlayingPage.tsx 상단 — 1번만 주입되는 이퀄라이저 CSS
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

// ✅ 검색 API 응답 타입
type SearchResult = {
    itunes_id: number;
    music_id?: number | null;
    album_id?: number | null;
    artist_name?: string | null;
    music_name?: string | null;
};
type SearchApiResponse = { results?: SearchResult[] };

// ✅ 앨범 상세 응답 타입
type AlbumTrack = { music_id?: number | null; music_name?: string | null };
type AlbumDetailResponse = { tracks?: AlbumTrack[] };

export default function NowPlayingPage() {
    ensureNowPlayingEqStyle();

    const navigate = useNavigate();

    const {
        current,
        queue,
        history,
        progress,
        duration,
        isPlaying,
        toggle,
        seek,
        removeFromQueue,
        moveQueueItem,
        shuffleQueue,
        nextTrack,
        previousTrack,
        repeatMode,
        toggleRepeat,
        setTrackAndPlay,
    } = usePlayer();

    const hasTrack = !!current;

    // ✅ 좌/우 패널 상태는 무조건 위에서 먼저 선언 (TDZ 방지)
    const [leftOpen, setLeftOpen] = useState(false); // 분석 대시보드
    const [rightOpen, setRightOpen] = useState(false); // 재생목록

    // ✅ push 레이아웃
    const LEFT_W = 500;
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

    // ✅ 재생 재시작 시 애니메이션 리셋용
    const [playSeq, setPlaySeq] = useState(0);
    useEffect(() => {
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

    // ✅ 곡 상세
    const [trackDetail, setTrackDetail] = useState<MusicDetailResponse | null>(null);
    const [trackLoading, setTrackLoading] = useState(false);
    const [trackErr, setTrackErr] = useState<string | null>(null);

    // ✅ 메인 앨범 이미지 (large 우선)
    const [mainAlbumImage, setMainAlbumImage] = useState<string | null>(null);

    // ✅ current 변경 시: trackDetail 1번만 불러오기 + mainAlbumImage 세팅
    useEffect(() => {
        let cancelled = false;

        (async () => {
        if (!current) {
            setTrackDetail(null);
            setMainAlbumImage(null);
            return;
        }

        // 0) 현재 트랙에 coverUrl이 이미 있으면 그걸 우선 사용
        const currCover = (current as { coverUrl?: string | null }).coverUrl ?? null;
        if (currCover) setMainAlbumImage(currCover);

        const musicId = (current as { musicId?: number | null }).musicId ?? null;

        // musicId가 없으면 detail 조회는 패스하고 (가능하면) best cover만 시도
        if (!musicId) {
            try {
            // 프로젝트에 맞게 getBestAlbumCover 시그니처가 다를 수 있어 안전하게 호출
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const best = await (getBestAlbumCover as any)?.({
                album: current.album,
                artist: current.artist,
                title: current.title,
            });
            if (!cancelled) {
                const bestUrl = typeof best === "string" ? best : best?.url ?? null;
                if (bestUrl) setMainAlbumImage(bestUrl);
            }
            } catch {
            // 조용히 무시
            }
            setTrackDetail(null);
            return;
        }

        try {
            setTrackLoading(true);
            setTrackErr(null);

            const detail = await getMusicDetail(musicId);
            if (cancelled) return;

            setTrackDetail(detail);

            // 1) detail에서 가장 큰 커버 우선
            const large =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (detail as any).image_large_square ??
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (detail as any).image_square ??
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (detail as any).album_image ??
                null;

            // 2) large가 있으면 mainAlbumImage 덮어쓰기
            if (large) setMainAlbumImage(large);
        } catch (e: unknown) {
            if (cancelled) return;
            setTrackErr(e instanceof Error ? e.message : "곡 분석을 불러오지 못했습니다.");
            setTrackDetail(null);
        } finally {
            if (!cancelled) setTrackLoading(false);
        }
        })();

        return () => {
        cancelled = true;
        };
    }, [current]);

    // ✅ 전체 배경에 사용할 블러 이미지 URL
    const blurredBackgroundImage = useMemo(() => {
        if (!mainAlbumImage) return null;
        return processImageUrl(mainAlbumImage);
    }, [mainAlbumImage, processImageUrl]);

    // ✅ 가사 패널
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

            let musicId: number | null = (current as { musicId?: number | null }).musicId ?? null;

            if (!musicId) {
            const itunesId = Number(current.id);
            if (Number.isNaN(itunesId)) {
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
                        const matchedTrack = albumData.tracks?.find((t) => t.music_name === current.title);
                        if (matchedTrack?.music_id) musicId = matchedTrack.music_id ?? null;
                    }
                    } catch (err) {
                    if (err instanceof DOMException && err.name === "AbortError") return;
                    }
                }
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
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
                    if (matched?.music_id) musicId = matched.music_id ?? null;
                }
                } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                }
            }

            if (!musicId) {
                setLyrics([]);
                setLyricsError(null);
                return;
            }
            }

            const lyricsUrl = `${API_BASE}/${musicId}/`;
            const res = await fetch(lyricsUrl, {
            method: "GET",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
            if (res.status === 404) {
                setLyrics([]);
                setLyricsError(null);
                return;
            }
            throw new Error(`가사 API 오류: ${res.status}`);
            }

            const data = (await res.json()) as { lyrics?: unknown };
            let parsedLyrics: LyricLine[] = [];

            if (typeof data.lyrics === "string" && data.lyrics.trim()) {
            const lines = data.lyrics.split(/\r?\n/).filter((line) => line.trim() !== "");

            parsedLyrics = lines
                .map((line) => {
                const timestampMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
                if (timestampMatch) {
                    const minutes = parseInt(timestampMatch[1], 10);
                    const seconds = parseInt(timestampMatch[2], 10);
                    const centiseconds = parseInt(timestampMatch[3], 10);
                    const timestampSeconds = minutes * 60 + seconds + centiseconds / 100;
                    const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/, "").trim();
                    return { t: timestampSeconds, text: text || line.trim(), timestamp: timestampMatch[0] };
                }
                return { t: 0, text: line.trim(), timestamp: null };
                })
                .filter((l) => l.text.trim() !== "")
                .sort((a, b) => a.t - b.t);

            setLyrics(parsedLyrics);
            } else {
            setLyrics([]);
            setLyricsError(null);
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            setLyricsError(err instanceof Error ? err.message : "가사를 불러올 수 없습니다.");
            setLyrics([]);
        } finally {
            setLyricsLoading(false);
        }
        })();

        return () => controller.abort();
    }, [current, API_BASE]);

    // ✅ playlists 변화 감지(좋아요 count 반영용)
    const [plTick, setPlTick] = useState(0);
    useEffect(() => {
        const unsub = subscribePlaylists(() => setPlTick((v) => v + 1));
        return () => {
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

    const [tab, setTab] = useState<"queue" | "history">("queue");
    const list = useMemo(() => (tab === "queue" ? queue : history), [tab, queue, history]);

    // ✅ 드래그앤드롭(핸들만 드래그)
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => (e: DragEvent<HTMLElement>) => {
        setDragIndex(index);
        setOverIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
    };

    const handleDragEnter = (index: number, isQueue: boolean) => () => {
        if (!isQueue) return;
        if (dragIndex === null) return;
        setOverIndex(index);
    };

    const handleDragOver = (index: number, isQueue: boolean) => (e: DragEvent<HTMLElement>) => {
        if (!isQueue) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverIndex(index);
    };

    const handleDrop = (index: number, isQueue: boolean) => (e: DragEvent<HTMLElement>) => {
        if (!isQueue) return;
        e.preventDefault();

        const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
        const to = index;

        if (Number.isFinite(from) && from !== to) {
        moveQueueItem(from, to);
        }

        setDragIndex(null);
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setOverIndex(null);
    };

    const handleStartStation = () => {
        if (!current) return;
        // TODO: station 로직
    };

    return (
        <div className="relative h-full w-full text-[#F6F6F6] overflow-hidden">
        {/* ✅ 앨범 이미지를 이용한 전체 배경 블러 */}
        {hasTrack && blurredBackgroundImage ? (
            <>
            <div
                className="pointer-events-none absolute inset-0 bg-center bg-cover"
                style={{
                backgroundImage: `url(${blurredBackgroundImage})`,
                filter: "blur(40px)",
                transform: "scale(1.15)",
                }}
            />
            <div className="pointer-events-none absolute inset-0 bg-black/60" />
            </>
        ) : (
            <div className="pointer-events-none absolute inset-0 bg-[#2d2d2d]" />
        )}

        {/* 좌측 대시보드 */}
        <aside
            className={[
            "absolute left-0 top-0 h-full bg-[#2f2f2f] border-r border-[#3d3d3d]",
            "transition-transform duration-300 ease-out z-10",
            ].join(" ")}
            style={{
            width: LEFT_W,
            transform: leftOpen ? "translateX(0)" : `translateX(-${LEFT_W}px)`,
            }}
        >
            <div className="mt-12 h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
            <div className="px-4 text-sm font-semibold text-white/80">분석 대시보드</div>
            <button
                type="button"
                onClick={toggleLeft}
                className="rounded-full p-2 hover:bg-white/10 transition"
                aria-label="대시보드 닫기"
            >
                <MdClose size={18} />
            </button>
            </div>

            <div className="p-4 space-y-3">
            {!current ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                재생 중인 곡이 없어요
                </div>
            ) : trackLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                곡 분석을 불러오는 중...
                </div>
            ) : trackErr ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                {trackErr}
                </div>
            ) : !trackDetail ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                곡 분석 데이터가 없어요 (musicId 없음/조회 실패)
                </div>
            ) : (
                <>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-white/80 font-semibold">현재 곡 분석</div>
                    <div className="mt-2 text-xs text-white/55 truncate">
                    {trackDetail.music_name}
                    {trackDetail.artist_name ? (
                        <span className="text-white/40"> · {trackDetail.artist_name}</span>
                    ) : null}
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-3">
                    <RingGauge
                        label="Valence"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        value01={to01((trackDetail as any).valence)}
                        subLabel="밝음/긍정"
                    />
                    <RingGauge
                        label="Arousal"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        value01={to01((trackDetail as any).arousal)}
                        subLabel="에너지/각성"
                    />
                    </div>
                    
                </div>
                { /*
                <Bars
                    title="트랙 메타"
                    items={[
                    {
                        label: "Duration(s)",
                        value: typeof trackDetail.duration === "number" ? Math.round(trackDetail.duration) : 0,
                    },
                    {
                        label: "Lyrics(lines)",
                        value:
                        typeof trackDetail.lyrics === "string"
                            ? trackDetail.lyrics.split(/\r?\n/).filter(Boolean).length
                            : 0,
                    },
                    { label: "AI Track", value: trackDetail.is_ai ? 100 : 0 },
                    ]}
                />

                <Sparkline
                    points={(() => {
                    const raw = typeof trackDetail.lyrics === "string" ? trackDetail.lyrics : "";
                    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

                    const N = Math.min(30, lines.length || 1);
                    const step = lines.length > N ? lines.length / N : 1;

                    const sampled = Array.from({ length: N }).map((_, i) => {
                        const idx = Math.min(lines.length - 1, Math.floor(i * step));
                        const len = lines[idx]?.trim().length ?? 0;
                        return { label: `${i + 1}`, plays: len };
                    });

                    return sampled.length ? sampled : [{ label: "1", plays: 0 }];
                    })()}
                />
                */ }

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-white/80 font-semibold">곡 정보</div>
                    <div className="mt-2 text-xs text-white/55">장르: {trackDetail.genre ?? "—"}</div>
                    <div className="mt-1 text-xs text-white/55">앨범: {trackDetail.album_name ?? "—"}</div>
                </div>
                
                </>
            )}
            </div>
            
        </aside>

        {/* 우측 재생목록 */}
        <aside
            className="absolute right-0 top-0 h-full bg-[#2f2f2f] border-l border-[#3d3d3d] transition-transform duration-300 ease-out flex flex-col z-10"
            style={{
            width: RIGHT_W,
            transform: rightOpen ? "translateX(0)" : `translateX(${RIGHT_W}px)`,
            }}
        >
            <div className="mt-12 h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
            <div className="px-4 text-sm font-semibold text-white/80">재생목록</div>
            <button
                type="button"
                onClick={toggleRight}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="재생목록 닫기"
            >
                <MdClose size={18} />
            </button>
            </div>

            <div className="flex-1 min-h-0 px-4 pt-4 flex flex-col">
            <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                <button
                type="button"
                onClick={() => setTab("queue")}
                className={[
                    "py-2.5 text-sm transition",
                    tab === "queue" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5",
                ].join(" ")}
                >
                재생 대기
                </button>
                <button
                type="button"
                onClick={() => setTab("history")}
                className={[
                    "py-2.5 text-sm transition",
                    tab === "history" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5",
                ].join(" ")}
                >
                재생 기록
                </button>
            </div>

            <div className="mt-4 border-t border-white/10 flex-shrink-0" />

            <div className="mt-2 pb-6 flex-1 min-h-0 overflow-y-auto">
                {list.length === 0 ? (
                <div className="mt-10 text-sm text-white/45 text-center">
                    {tab === "queue" ? "재생 대기 목록이 비어있어요" : "재생 기록이 없어요"}
                </div>
                ) : (
                <div className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                    {list.map((t, i) => {
                    const isQueue = tab === "queue";

                    return (
                        <div
                        key={t.id}
                        onDragEnter={handleDragEnter(i, isQueue)}
                        onDragOver={handleDragOver(i, isQueue)}
                        onDrop={handleDrop(i, isQueue)}
                        onDoubleClick={() => {
                            if (isQueue) setTrackAndPlay(t);
                        }}
                        className={[
                            "w-full transition",
                            "hover:bg-white/5",
                            isQueue ? "select-none cursor-pointer" : "",
                            overIndex === i && dragIndex !== null && dragIndex !== i
                            ? "bg-white/10 outline outline-1 outline-white/15"
                            : "",
                            dragIndex === i ? "opacity-60" : "",
                        ].join(" ")}
                        >
                        <div className="grid grid-cols-[28px_44px_1fr_auto] items-center gap-3 px-3 py-3">
                            <div className="flex items-center justify-center text-white/40">
                            {isQueue ? (
                                <span
                                role="button"
                                tabIndex={0}
                                draggable
                                onDragStart={handleDragStart(i)}
                                onDragEnd={handleDragEnd}
                                onMouseDown={(ev) => ev.stopPropagation()}
                                onClick={(ev) => ev.stopPropagation()}
                                className="cursor-grab active:cursor-grabbing"
                                aria-label="드래그로 순서 변경"
                                title="드래그로 순서 변경"
                                >
                                <MdDragIndicator size={20} />
                                </span>
                            ) : null}
                            </div>

                            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/10 overflow-hidden relative flex-shrink-0">
                            {t.coverUrl ? (
                                <>
                                <img
                                    src={processImageUrl(t.coverUrl) || undefined}
                                    alt={t.title}
                                    className="w-full h-full object-cover relative z-10"
                                    onError={(ev) => {
                                    (ev.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-white/20 animate-pulse z-0" />
                                </>
                            ) : (
                                <div className="w-full h-full bg-white/20" />
                            )}
                            </div>

                            <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{t.title}</div>
                            <div className="text-xs text-white/60 truncate">{t.artist}</div>
                            </div>

                            {isQueue ? (
                            <button
                                type="button"
                                onClick={(ev) => {
                                ev.stopPropagation();
                                removeFromQueue(t.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition"
                                aria-label="대기 목록에서 삭제"
                                title="대기 목록에서 삭제"
                            >
                                <MdDelete size={18} className="text-white/75" />
                            </button>
                            ) : null}
                        </div>
                        </div>
                    );
                    })}
                </div>
                )}
            </div>
            </div>
        </aside>

        {/* 상단 바 */}
        <div className="relative z-10 h-16 px-6 flex items-center justify-between">
            <div className="min-w-0">
            <button
                type="button"
                onClick={toggleLeft}
                className={[
                "p-2 rounded-full transition hover:bg-white/10",
                leftOpen ? "text-[#AFDEE2]" : "text-[#F6F6F6]",
                ].join(" ")}
                aria-label="분석 대시보드 토글"
                title="분석 대시보드"
            >
                <RiDashboardFill size={18} />
            </button>
            </div>

            <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={(ev) => {
                ev.stopPropagation();
                toggleLike();
                }}
                className={[
                "h-11 rounded-2xl",
                "flex items-center gap-2",
                "transition relative",
                liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                ].join(" ")}
                aria-label="좋아요"
                title="좋아요"
            >
                <MdFavorite size={22} className={liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"} />
                <span className="text-sm tabular-nums">{shownLikeCount.toLocaleString()}</span>
            </button>

            <button
                type="button"
                onClick={handleStartStation}
                className="p-2 ml-1 rounded-full hover:bg-white/10 transition"
                aria-label="스테이션 생성"
                title="스테이션 생성"
            >
                <MdAutoAwesome size={20} className={"text-[#f6f6f6]/80"} />
            </button>

            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="뒤로 가기"
                title="뒤로 가기"
            >
                <GrContract size={18} className={"text-[#f6f6f6]/80"} />
            </button>
            </div>
        </div>

        {/* 본문 */}
        <div className="h-[calc(100%-4rem)] relative">
            <div className="h-full transition-all duration-300 ease-out" style={{ marginLeft: leftShift, marginRight: rightShift }}>
            <div className="h-full">
                <div className="h-full pt-4 overflow-hidden">
                <div className="h-full flex flex-col items-center justify-center px-6">
                    <div className="w-full max-w-[860px] flex flex-col items-center gap-4">
                    {/* ✅ 앨범 + 뒤 이퀄라이저 */}
                    <div className="relative">
                        {hasTrack && (
                        <div
                            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ width: 820, height: 240, opacity: 0.75, zIndex: 0 }}
                            aria-hidden
                        >
                            <div className="w-full h-full flex items-end justify-center gap-[10px]">
                            {Array.from({ length: 26 }).map((_, i) => {
                                const eqActive = hasTrack && isPlaying;
                                const dur = 1.6 + (i % 7) * 0.18;
                                const delay = (i % 11) * 0.07;

                                return (
                                <div
                                    key={`${playSeq}-${i}`}
                                    className="np-eq-bar rounded-full"
                                    style={{
                                    width: 12,
                                    height: 60 + (i % 6) * 28,
                                    background: "rgba(255,255,255,0.28)",
                                    animation: eqActive ? `np-eq-calm ${dur}s ease-in-out infinite` : "none",
                                    animationDelay: `${delay}s`,
                                    transform: eqActive ? undefined : "scaleY(0.22)",
                                    opacity: eqActive ? 0.55 : 0.25,
                                    transition: "transform 0.25s ease, opacity 0.25s ease",
                                    }}
                                />
                                );
                            })}
                            </div>
                        </div>
                        )}

                        <div className="w-[360px] aspect-square rounded-3xl bg-white/25 overflow-hidden relative z-10">
                        {hasTrack && mainAlbumImage ? (
                            <>
                            <img
                                src={processImageUrl(mainAlbumImage) || undefined}
                                alt={current.title}
                                className="w-full h-full object-cover relative z-10"
                                onError={(ev) => {
                                (ev.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-white/25 animate-pulse z-0" />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white/60 text-sm">사진</span>
                            </div>
                        )}
                        </div>
                    </div>

                    <div className="min-w-0 text-center">
                        <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                        {hasTrack ? current.title : "재생 중인 곡이 없어요"}
                        </div>
                        <div className="mt-1 text-sm text-white/60 truncate">{hasTrack ? current.artist : "—"}</div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                        setLyricsOpen(true);
                        setLeftOpen(false);
                        setRightOpen(false);
                        }}
                        className={["w-[520px]", "transition text-center relative", "hover:opacity-80"].join(" ")}
                    >
                        <div className="mt-4 text-sm text-[#f6f6f6]/80">전체 가사 보기</div>
                    </button>
                    </div>
                </div>
                </div>
            </div>
            </div>

            {/* 손잡이 */}
            {!leftOpen && (
            <button
                type="button"
                onClick={toggleLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-0
                h-24 w-10 rounded-r-2xl bg-white/10 hover:bg-white/15 border border-white/10
                flex items-center justify-center transition"
                aria-label="대시보드 열기"
                title="대시보드 열기"
            >
                <RiDashboardFill size={18} />
            </button>
            )}

            {!rightOpen && (
            <button
                type="button"
                onClick={toggleRight}
                className="absolute right-0 top-1/2 -translate-y-1/2
                h-24 w-10 rounded-l-2xl bg-white/10 hover:bg-white/15 border border-white/10
                flex items-center justify-center transition"
                aria-label="재생목록 열기"
                title="재생목록 열기"
            >
                <MdQueueMusic size={18} />
            </button>
            )}
        </div>

        {/* Lyrics Bottom Sheet */}
        <div className={["absolute inset-0 z-50", lyricsOpen ? "pointer-events-auto" : "pointer-events-none"].join(" ")}>
            <div
            onClick={() => setLyricsOpen(false)}
            className={[
                "absolute inset-0 transition-opacity duration-300",
                lyricsOpen ? "opacity-100 bg-black/55" : "opacity-0",
            ].join(" ")}
            />

            <div
            className={[
                "fixed left-0 right-0 bottom-0",
                "transition-transform duration-300 ease-out",
                lyricsOpen ? "translate-y-0" : "translate-y-full",
            ].join(" ")}
            >
            <div className="mx-auto w-[820px] max-w-[95vw] rounded-t-3xl bg-[#2f2f2f] border border-white/10 overflow-hidden shadow-2xl">
                <div className="relative">
                <div className="pt-3 pb-2 flex items-center justify-center">
                    <div className="h-[4px] w-14 rounded-full bg-white/25" />
                </div>

                <div className="h-12 px-5 flex items-center justify-between border-b border-white/10">
                    <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/85 truncate">가사</div>
                    <div className="text-xs text-white/50 truncate">
                        {hasTrack ? `${current.title} · ${current.artist}` : "—"}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={() => setLyricsOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition"
                    aria-label="가사 닫기"
                    >
                    <MdClose size={18} />
                    </button>
                </div>
                </div>

                <div className="h-[52vh] px-6 py-5 overflow-y-auto">
                {lyricsLoading ? (
                    <div className="flex items-center justify-center h-full">
                    <div className="text-sm text-white/60">가사를 불러오는 중...</div>
                    </div>
                ) : lyricsError ? (
                    <div className="flex items-center justify-center h-full">
                    <div className="text-sm text-white/60">{lyricsError}</div>
                    </div>
                ) : lyrics.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                    <div className="text-sm text-white/60">가사가 없습니다.</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                    {lyrics.map((line, i) => (
                        <div key={`${line.t}-${i}`} className="text-lg leading-8 text-white/80">
                        {line.text}
                        </div>
                    ))}
                    </div>
                )}
                </div>

                {/* 하단 플레이어 컨트롤 */}
                <div className="border-t border-white/10 bg-[#2d2d2d] px-6 py-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={shuffleQueue}
                        disabled={!hasTrack}
                        className={[
                        "transition",
                        hasTrack ? "text-white/60 hover:text-white" : "text-white/30 cursor-not-allowed",
                        ].join(" ")}
                        aria-label="셔플"
                        title="재생 대기 곡들 셔플"
                    >
                        <MdShuffle size={20} />
                    </button>

                    <button
                        type="button"
                        onClick={previousTrack}
                        disabled={!hasTrack}
                        className={[
                        "transition",
                        hasTrack ? "text-white/60 hover:text-white" : "text-white/30 cursor-not-allowed",
                        ].join(" ")}
                        aria-label="이전 곡"
                        title="이전 곡"
                    >
                        <MdSkipPrevious size={24} />
                    </button>

                    <button
                        type="button"
                        onClick={toggle}
                        disabled={!hasTrack}
                        className={[
                        "h-10 w-10 rounded-full flex items-center justify-center transition",
                        hasTrack
                            ? "bg-[#E4524D] text-white hover:brightness-110"
                            : "bg-white/10 text-white/40 cursor-not-allowed",
                        ].join(" ")}
                        aria-label={isPlaying ? "일시정지" : "재생"}
                        title={isPlaying ? "일시정지" : "재생"}
                    >
                        {isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
                    </button>

                    <button
                        type="button"
                        onClick={nextTrack}
                        disabled={!hasTrack}
                        className={[
                        "transition",
                        hasTrack ? "text-white/60 hover:text-white" : "text-white/30 cursor-not-allowed",
                        ].join(" ")}
                        aria-label="다음 곡"
                        title="다음 곡"
                    >
                        <MdSkipNext size={24} />
                    </button>

                    <button
                        type="button"
                        onClick={toggleRepeat}
                        disabled={!hasTrack}
                        className={[
                        "transition",
                        hasTrack
                            ? repeatMode === "one"
                            ? "text-[#AFDEE2]"
                            : "text-white/60 hover:text-white"
                            : "text-white/30 cursor-not-allowed",
                        ].join(" ")}
                        aria-label="반복"
                        title={repeatMode === "one" ? "한 곡 반복" : "반복 끄기"}
                    >
                        <MdRepeat size={20} />
                    </button>
                    </div>

                    <div className="w-full flex items-center gap-3">
                    <span className="text-xs text-white/60 tabular-nums min-w-[40px] text-right">
                        {(() => {
                        const p = Number.isFinite(progress) ? progress : 0;
                        const m = Math.floor(p / 60);
                        const s = Math.floor(p % 60);
                        return `${m}:${s.toString().padStart(2, "0")}`;
                        })()}
                    </span>

                    <div
                        className="flex-1 h-1 bg-white/10 rounded-full relative cursor-pointer"
                        onClick={(e) => {
                        if (!hasTrack || duration <= 0) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, x / rect.width));
                        seek(ratio * duration);
                        }}
                        onPointerDown={(e) => {
                        if (!hasTrack || duration <= 0) return;
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();

                        const setSeek = (clientX: number) => {
                            const x = clientX - rect.left;
                            const ratio = Math.max(0, Math.min(1, x / rect.width));
                            seek(ratio * duration);
                        };

                        setSeek(e.clientX);
                        e.currentTarget.setPointerCapture(e.pointerId);

                        const onMove = (ev: PointerEvent) => setSeek(ev.clientX);
                        const onUp = () => {
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                        };

                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                        }}
                    >
                        <div
                        className="h-full bg-[#E4524D] rounded-full transition-all"
                        style={{
                            width: `${duration > 0 ? Math.min(100, (progress / duration) * 100) : 0}%`,
                        }}
                        />
                        <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#E4524D] transition-all"
                        style={{
                            left: `${duration > 0 ? Math.min(100, (progress / duration) * 100) : 0}%`,
                        }}
                        />
                    </div>

                    <span className="text-xs text-white/60 tabular-nums min-w-[40px]">
                        {(() => {
                        const d = Number.isFinite(duration) ? duration : 0;
                        const m = Math.floor(d / 60);
                        const s = Math.floor(d % 60);
                        return `${m}:${s.toString().padStart(2, "0")}`;
                        })()}
                    </span>
                    </div>
                </div>
                </div>
                {/* /하단 플레이어 */}
            </div>
            </div>
        </div>
        </div>
    );
}

/**
 * NOTE:
 * - RingGauge, Bars, Sparkline 컴포넌트는 네 기존 파일/프로젝트에 있는 걸 그대로 쓰면 됨.
 * - 만약 getBestAlbumCover 시그니처가 다르면, 그 부분만 네 함수 형태에 맞춰 3줄 정도 수정하면 끝.
 */

function RingGauge({
    label,
    value01,
    subLabel,
    }: {
        label: string;
        value01: number; // 0~1
        subLabel?: string;
    }) {
        const radius = 28;
        const stroke = 6;
        const c = 2 * Math.PI * radius;
        const v = Math.max(0, Math.min(1, value01));
        const offset = c * (1 - v);
    
        // ✅ defs id 중복 방지
        const safeId = label.replace(/[^a-zA-Z0-9_-]/g, "");
        const gid = `gaugeGradient-${safeId}`;
        const fid = `softGlow-${safeId}`;
    
        return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center">
            <svg width="80" height="80" className="mb-2">
            <defs>
                <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EAF7FA" />
                <stop offset="45%" stopColor="#AFDEE2" />
                <stop offset="100%" stopColor="#7FBBC3" />
                </linearGradient>
    
                <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
                </filter>
            </defs>
    
            {/* 배경 링 */}
            <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={stroke}
                fill="none"
            />
    
            {/* 진행 링 (그라데이션 + 글로우) */}
            <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={`url(#${gid})`}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                filter={`url(#${fid})`}
            />
            </svg>
    
            <div className="text-sm font-semibold text-white/85">{label}</div>
            {subLabel && <div className="text-xs text-white/50">{subLabel}</div>}
            <div className="mt-1 text-xs text-white/70">{Math.round(v * 100)}%</div>
        </div>
        );
    }
    
    