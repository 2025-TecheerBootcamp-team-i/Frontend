import { useMemo, useState, useEffect, useCallback } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MdFavorite, MdMoreHoriz } from "react-icons/md";
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
import {
    isTrackLiked,
    toggleTrackLike,
    subscribePlaylists,
} from "../../mocks/playlistMock";
import { getBestAlbumCover } from "../../api/album";

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
    } = usePlayer();

    const hasTrack = !!current;

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

    // ✅ 전체 배경에 사용할 블러용 이미지 URL
    // - 메인 앨범 이미지가 있을 때만 사용
    // - processImageUrl로 절대 경로 변환
    const blurredBackgroundImage = useMemo(() => {
        if (!mainAlbumImage) return null;
        return processImageUrl(mainAlbumImage);
    }, [mainAlbumImage, processImageUrl]);

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

    // ✅ 좌/우 패널 상태
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

    const [tab, setTab] = useState<"queue" | "history">("queue");
    const list = useMemo(() => (tab === "queue" ? queue : history), [tab, queue, history]);

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

    return (
        <div className="relative h-full w-full text-[#F6F6F6] overflow-hidden">
        {/* ✅ 앨범 이미지를 이용한 전체 배경 블러
            - 확대 화면 전체를 앨범 이미지로 채우고
            - 강한 블러 + 살짝 어둡게 처리해서 가독성 확보 */}
        {hasTrack && blurredBackgroundImage ? (
            <>
            {/* 실제 이미지 블러 배경 */}
            <div
                className="pointer-events-none absolute inset-0 bg-center bg-cover"
                style={{
                backgroundImage: `url(${blurredBackgroundImage})`,
                filter: "blur(40px)",
                transform: "scale(1.15)",
                }}
            />
            {/* 위에 반투명 어두운 오버레이 */}
            <div className="pointer-events-none absolute inset-0 bg-black/60" />
            </>
        ) : (
            // 앨범 이미지가 없을 때 기본 배경
            <div className="pointer-events-none absolute inset-0 bg-[#2d2d2d]" />
        )}
        {/* 상단 바 */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#3d3d3d]">
            {/* 좌측 */}
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

            {/* 우측 */}
            <div className="flex items-center gap-2">
            {/* 좋아요 */}
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

            {/* 더보기 */}
            <button
                type="button"
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="더보기"
                title="더보기"
            >
                <MdMoreHoriz size={20} />
            </button>

            {/* 화면 다시 줄이기 */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="뒤로 가기"
                title="뒤로 가기"
            >
                <GrContract size={18} />
            </button>
            </div>
        </div>

        {/* 본문 */}
        <div className="h-[calc(100%-4rem)] relative">
            {/* 중앙 메인 */}
            <div
            className="h-full transition-all duration-300 ease-out"
            style={{ marginLeft: leftShift, marginRight: rightShift }}
            >
            <div className="h-full">
                {/* 중앙 영역 배경을 투명하게 유지해서 전체 블러 배경이 그대로 보이도록 처리 */}
                <div className="h-full pt-4 overflow-hidden">
                <div className="h-full flex flex-col items-center justify-center px-6">
                    <div className="w-full max-w-[860px] flex flex-col items-center gap-4">
                    {/* 앨범아트 */}
                    <div className="w-[360px] aspect-square rounded-3xl bg-white/25 overflow-hidden relative">
                        {hasTrack && mainAlbumImage ? (
                        <>
                            <img
                            src={processImageUrl(mainAlbumImage) || undefined}
                            alt={current.title}
                            className="w-full h-full object-cover relative z-10"
                            onError={(ev) => {
                                console.error(`[NowPlayingPage] ❌ 메인 앨범 이미지 로드 실패:`, {
                                title: current.title,
                                image_url: mainAlbumImage,
                                });
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

                    <div className="min-w-0 text-center">
                        <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                        {hasTrack ? current.title : "재생 중인 곡이 없어요"}
                        </div>
                        <div className="mt-1 text-sm text-white/60 truncate">
                        {hasTrack ? current.artist : "—"}
                        </div>
                    </div>

                    {/* 가사 */}
                    <button
                        type="button"
                        onClick={() => {
                        setLyricsOpen(true);
                        setLeftOpen(false);
                        setRightOpen(false);
                        }}
                        className={["w-[520px]", "transition text-center relative", "hover:opacity-80"].join(
                        " "
                        )}
                    >
                        <div className="mt-4 text-sm text-[#f6f6f6]/80">전체 가사 보기</div>
                    </button>
                    </div>
                </div>
                </div>
            </div>
            </div>

            {/* 좌측 대시보드 */}
            <aside
            className={[
                "absolute left-0 top-0 h-full bg-[#2f2f2f] border-r border-[#3d3d3d]",
                "transition-transform duration-300 ease-out",
            ].join(" ")}
            style={{
                width: LEFT_W,
                transform: leftOpen ? "translateX(0)" : `translateX(-${LEFT_W}px)`,
            }}
            >
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
                <div className="text-sm font-semibold text-white/80">분석 대시보드</div>
                <button
                type="button"
                onClick={toggleLeft}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="대시보드 닫기"
                >
                <MdClose size={18} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/80 font-semibold">현재 곡 분석</div>
                <div className="mt-2 text-xs text-white/55">BPM / Mood / Energy 같은 카드</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/80 font-semibold">최근 청취 패턴</div>
                <div className="mt-2 text-xs text-white/55">그래프/요약</div>
                </div>
            </div>
            </aside>

            {/* 우측 재생목록 */}
            <aside
            className="absolute right-0 top-0 h-full bg-[#2f2f2f] border-l border-[#3d3d3d] transition-transform duration-300 ease-out flex flex-col"
            style={{
                width: RIGHT_W,
                transform: rightOpen ? "translateX(0)" : `translateX(${RIGHT_W}px)`,
            }}
            >
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
                <div className="text-sm font-semibold text-white/80">재생목록</div>
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
                {/* 탭 */}
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

                {/* 리스트 */}
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
                            className={[
                            "w-full transition",
                            "hover:bg-white/5",
                            isQueue ? "select-none" : "",
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

                            {/* 앨범 이미지 */}
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

                            {/* 큐 탭에서만 삭제 */}
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
        <div
            className={[
            "absolute inset-0 z-50",
            lyricsOpen ? "pointer-events-auto" : "pointer-events-none",
            ].join(" ")}
        >
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
                            <div
                                key={`${line.t}-${i}`}
                                className="text-lg leading-8 text-white/80"
                            >
                                {line.text}
                            </div>
                        ))}
                    </div>
                )}
                </div>

                {/* 하단 플레이어 컨트롤 */}
                <div className="border-t border-white/10 bg-[#2d2d2d] px-6 py-4">
                <div className="flex flex-col items-center gap-3">
                    {/* 컨트롤 버튼들 */}
                    <div className="flex items-center gap-4">
                    {/* 셔플 */}
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

                    {/* 이전 곡 */}
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

                    {/* 재생 / 일시정지 */}
                    <button
                        type="button"
                        onClick={toggle}
                        disabled={!hasTrack}
                        className={[
                        "h-10 w-10 rounded-full flex items-center justify-center transition",
                        hasTrack ? "bg-[#E4524D] text-white hover:brightness-110" : "bg-white/10 text-white/40 cursor-not-allowed",
                        ].join(" ")}
                        aria-label={isPlaying ? "일시정지" : "재생"}
                        title={isPlaying ? "일시정지" : "재생"}
                    >
                        {isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
                    </button>

                    {/* 다음 곡 */}
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

                    {/* 반복 */}
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

                    {/* 진행 바 */}
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
