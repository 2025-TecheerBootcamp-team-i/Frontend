import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { fetchPopularArtists, type PopularArtist } from "../../api/artist";
import { fetchChart, type ChartData, type ChartType, type ChartRow as ApiChartRow } from "../../api/chart";
import { listPublicPlaylists, type PlaylistSummary } from "../../api/playlist";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

type HorizontalScrollerProps = {
    children: React.ReactNode;
    scrollStep?: number;
    gradientFromClass?: string; // 배경색 맞추기
};

function HorizontalScroller({
    children,
    scrollStep = 300,
    gradientFromClass = "from-[#2d2d2d]",
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
        {/* 스크롤 영역 */}
        <div
            ref={ref}
            onScroll={update}
            className="overflow-x-auto overflow-y-hidden no-scrollbar"
        >
            {children}
        </div>

        {/* 왼쪽 화살표 */}
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
                rotate-180
            "
            aria-label="왼쪽으로 이동"
            >
            <MdOutlineNavigateNext size={22} />
            </button>
        )}

        {/* 오른쪽 화살표 */}
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

        {/* 그라데이션 힌트 */}
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

function getErrorMessage(e: unknown, fallback: string) {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    return fallback;
}  

function HomePage() {
    const navigate = useNavigate();
    const { setTrackAndPlay } = usePlayer();

    // ✅ tab을 먼저 선언 (goChart에서 사용)
    const [tab, setTab] = useState<"TOP100" | "DAILY" | "AI">("TOP100");

    const goChart = () => {
    const map = { TOP100: "top100", DAILY: "daily", AI: "ai" } as const;
    navigate(`/chart/${map[tab]}`);
    };

    const [popularArtists, setPopularArtists] = useState<PopularArtist[]>([]);
    const [popularLoading, setPopularLoading] = useState(false);
    const [popularError, setPopularError] = useState<string | null>(null);

    const [chartByType, setChartByType] = useState<Record<ChartType, ChartData | null>>({
    realtime: null,
    daily: null,
    ai: null,
    });
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState<string | null>(null);

    // 인기 공개 플레이리스트
    const [publicPlaylists, setPublicPlaylists] = useState<PlaylistSummary[]>([]);
    const [playlistsLoading, setPlaylistsLoading] = useState(false);
    const [playlistsError, setPlaylistsError] = useState<string | null>(null);

    const TAB_TO_CHARTTYPE: Record<"TOP100" | "DAILY" | "AI", ChartType> = {
    TOP100: "realtime",
    DAILY: "daily",
    AI: "ai",
    };

    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const updateArtistScrollHint = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    // ✅ 이전 순위 스냅샷 저장
    const prevRankByIdRef = useRef<Record<string, number>>({});

    // ✅ 인기 아티스트 fetch
    useEffect(() => {
    let alive = true;

    (async () => {
        try {
        setPopularLoading(true);
        setPopularError(null);

        const data = await fetchPopularArtists(10);
        if (!alive) return;

        setPopularArtists(data);
        } catch (e: unknown) {
        if (!alive) return;
        setPopularError(getErrorMessage(e, "인기 아티스트 로딩 실패"));
        } finally {
        setPopularLoading(false);
        }
    })();

    return () => {
        alive = false;
    };
    }, []);

    useEffect(() => {
    requestAnimationFrame(updateArtistScrollHint);
    }, [popularArtists]);

    // ✅ 스크롤 힌트 이벤트
    useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateArtistScrollHint();
    el.addEventListener("scroll", updateArtistScrollHint);
    window.addEventListener("resize", updateArtistScrollHint);

    return () => {
        el.removeEventListener("scroll", updateArtistScrollHint);
        window.removeEventListener("resize", updateArtistScrollHint);
    };
    }, []);

    // ✅ 일일/AI 차트는 최초 1회만 로드
    useEffect(() => {
    let alive = true;

    (async () => {
        try {
        const results = await Promise.allSettled([
            fetchChart("daily"),
            fetchChart("ai"),
        ]);
        if (!alive) return;

        const daily = results[0].status === "fulfilled" ? results[0].value : null;
        const ai = results[1].status === "fulfilled" ? results[1].value : null;

        setChartByType((prev) => ({ ...prev, daily, ai }));
        } catch (e: unknown) {
        console.error("일일/AI 차트 로딩 실패:", e);
        }
    })();

    return () => {
        alive = false;
    };
    }, []);

    // ✅ 인기 공개 플레이리스트 로드
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setPlaylistsLoading(true);
                setPlaylistsError(null);

                const data = await listPublicPlaylists();
                if (!alive) return;

                const filtered = data.filter((p) => 
                    p.like_count >= 20 && 
                    p.visibility !== "system"
                );

                const shuffled = [...filtered].sort(() => Math.random() - 0.5);

                setPublicPlaylists(shuffled);
            } catch (e: unknown) {
                if (!alive) return;
                setPlaylistsError(getErrorMessage(e, "플레이리스트 로딩 실패"));
            } finally {
                if (alive) setPlaylistsLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    // ✅ 실시간 차트는 10분마다 갱신
    useEffect(() => {
    let alive = true;

    const loadRealtime = async () => {
        try {
        setChartLoading(true);
        setChartError(null);

        const realtime = await fetchChart("realtime");
        if (!alive) return;

        const nextPrev: Record<string, number> = {};
        for (const item of realtime.items) nextPrev[item.musicId] = item.rank;
        prevRankByIdRef.current = nextPrev;

        setChartByType((prev) => ({ ...prev, realtime }));
        } catch (e: unknown) {
        if (!alive) return;
        setChartError(getErrorMessage(e, "실시간 차트 로딩 실패"));
        } finally {
        if (alive) setChartLoading(false);
        }
    };

    loadRealtime();
    const timer = window.setInterval(loadRealtime, 10 * 60 * 1000);

    return () => {
        alive = false;
        window.clearInterval(timer);
    };
    }, []);


    const tabBtn = (key: "TOP100" | "DAILY" | "AI", label: string) => {
    const active = tab === key;
    return (
        <button
        type="button"
        onClick={() => setTab(key)}
        className={[
            "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
            active
              ? "bg-[#E4524D]/80 text-[#F6F6F6]"
              : "bg-white/20 text-[#F6F6F6] hover:bg-white/[0.08]",
        ].join(" ")}
        >
        {label}
        </button>
    );
    };

    const currentType = TAB_TO_CHARTTYPE[tab];
    const currentChart = chartByType[currentType];
    
    const previewRows = (() => {
        if (!currentChart) return [];
        const seen = new Set<string>();
        const unique = currentChart.items.filter(item => {
            if (seen.has(item.musicId)) return false;
            seen.add(item.musicId);
            return true;
        });
        return unique.slice(0, 6);
    })();

    const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
    };


    const toTrack = (row: ApiChartRow): PlayerTrack => {
    const audioUrl = row.audioUrl && row.audioUrl.length > 0 ? row.audioUrl : "/audio/sample.mp3";

    return {
        id: row.musicId,
        musicId: Number(row.musicId),
        title: row.musicName,
        artist: row.artistName,
        coverUrl: row.albumImage,
        audioUrl,
        duration: formatDuration(row.durationSec),
    };
    };
    
    return (
        <>
        {/* 인기 아티스트 */}
        <section className="mb-2">
            <div className="relative">
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto px-4 py-6 no-scrollbar scroll-smooth"
            >
                {popularLoading && <div className="text-[#F6F6F6]/70 px-2">로딩중...</div>}
                {popularError && <div className="text-red-300 px-2">{popularError}</div>}

                {!popularLoading && !popularError && popularArtists.map((a) => (
                <div
                    key={a.artist_id}
                    className="shrink-0 flex flex-col items-center group cursor-pointer"
                    onClick={() => navigate(`/artists/${a.artist_id}`)}
                >
                    {/* ✅ 유리구슬 효과 + 훨씬 큰 크기(200px) 적용 */}
                    <div
                        className="
                            w-[180px] h-[180px] rounded-full bg-white/[0.05]
                            transition-all duration-700 ease-out
                            group-hover:-translate-y-2 group-hover:scale-110
                            group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.35),0_0_30px_rgba(175,222,226,0.15)]
                            overflow-hidden relative
                            backdrop-blur-2xl
                            shadow-[inset_0_2px_15px_rgba(255,255,255,0.2),0_15px_30px_rgba(0,0,0,0.4)]
                        "
                    >
                        {a.image_small_circle ? (
                            <>
                                <img
                                    src={a.image_small_circle}
                                    alt={a.artist_name}
                                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 opacity-80 group-hover:opacity-100 brightness-95 group-hover:brightness-110"
                                    loading="lazy"
                                    decoding="async"
                                    fetchPriority="low"
                                />
                                
                                {/* 유리구슬 효과 레이어들 */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/20 pointer-events-none" />
                                <div className="absolute top-[8%] left-[15%] w-[45%] h-[25%] bg-gradient-to-b from-white/50 to-transparent rounded-[100%] rotate-[-15deg] blur-[3px] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-[5%] right([10%] w-[35%] h-[20%] bg-white/30 blur-[10px] rounded-full pointer-events-none" />
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10 animate-pulse bg-white/5">
                                <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
                            </div>
                        )}
                    </div>

                    <div className="mt-4 w-[200px] text-center text-sm text-[#F6F6F6]/80 break-words leading-snug transition group-hover:text-[#f6f6f6]/50">{a.artist_name}</div>
                    <div className="mt-2 text-xs text-[#f6f6f6]/30">
                        #{a.rank} · {a.play_count}회
                    </div>
                </div>
                ))}
            </div>

            {showLeft && (
                <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-black/40 to-transparent z-10" />
            )}
            {showRight && (
                <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-black/40 to-transparent z-10" />
            )}
            </div>
        </section>

        {/* 차트 요약 - 투명 유리 박스 스타일 적용 */}
        <section className="mb-4">
            <div className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 p-6 pb-2 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                {/* 상단 헤더 */}
                <div className="flex items-center pt-2 justify-between mb-3">
                    <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={goChart}
                        className="px-3 text-2xl font-semibold hover:text-[#f6f6f6]/50 text-[#f6f6f6] transition whitespace-nowrap"
                    >
                        실시간 차트
                    </button>

                    <div className="flex gap-2 shrink-0">
                        {tabBtn("TOP100", "TOP 100")}
                        {tabBtn("DAILY", "일일차트")}
                        {tabBtn("AI", "AI 음악")}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={goChart}
                    className="px-3 shrink-0 text-[#f6f6f6] hover:text-[#f6f6f6]/50 text-xl leading-none transition"
                    >
                    <MdOutlineNavigateNext size={30} />
                    </button>
                </div>

                <div className="border-b border-white/10" />

                {chartLoading && <div className="p-4 text-[#f6f6f6]/50">차트 로딩중...</div>}
                {chartError && <div className="p-4 text-red-400/80">{chartError}</div>}

                {/* 리스트 */}
                <div className="divide-y divide-white/5 overflow-hidden">
                    {previewRows.map((row) => (
                    <div
                        key={row.musicId}
                        className="
                        group w-full text-left grid
                        grid-cols-[60px_70px_1fr_1fr_80px]
                        items-center px-2 py-2
                        hover:bg-white/[0.08] transition-all
                        "
                    >
                        {/* 순위 / 재생 버튼 */}
                        <div className="relative flex items-center justify-center">
                        <span className="text-sm text-[#F6F6F6] transition-opacity group-hover:opacity-0">
                            {row.rank}
                        </span>

                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTrackAndPlay(toTrack(row));
                            }}
                            className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#AFDEE2]">
                            <FaPlay />
                        </button>
                        </div>

                        <div className="text-center text-xs font-medium">
                        {(() => {
                            const change = row.rankChange;

                            if (change === null || change === 0) return <span className="text-[#AAAAAA]">—</span>;
                            if (change > 0) return <span className="text-red-500">▲ {change}</span>;
                            if (change < 0) return <span className="text-blue-500">▼ {Math.abs(change)}</span>;
                            return <span className="text-[#AAAAAA]">—</span>;
                        })()}
                        </div>

                        <div className="ml-5 flex items-center gap-4 min-w-0 truncate">
                        {row.albumImage ? (
                            <img 
                            src={row.albumImage} 
                            alt={row.albumName}
                            className="w-12 h-12 rounded-lg object-cover bg-[#D9D9D9] shrink-0"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                            }}
                            />
                        ) : null}
                        <div className={`w-12 h-12 rounded-lg bg-[#D9D9D9] shrink-0 ${row.albumImage ? 'hidden' : ''}`} />
                        <div className="text-sm text-[#F6F6F6] whitespace-nowrap truncate">
                            {row.musicName}
                            {row.isAi && (
                                <span className="shrink-0 ml-3 text-xs px-2 py-[1px] rounded-full bg-[#E4524D]/20 text-[#E4524D]">
                                AI
                                </span>
                            )}
                        </div>
                        </div>

                        <div className="hidden sm:block text-sm text-[#F6F6F6] whitespace-nowrap">
                        {row.artistName}
                        </div>

                        <div className="text-right pr-6 text-sm text-[#F6F6F6] whitespace-nowrap">
                        {formatDuration(row.durationSec)}
                        </div>
                    </div>
                    ))}
                </div>

                <div className="flex justify-center border-t border-white/10 p-4 text-[#f6f6f6]/50">
                    <button
                    type="button"
                    onClick={goChart}
                    aria-label="전체 차트로 이동"
                    title="전체 차트"
                    className="hover:text-[#f6f6f6]/80 transition"
                    >
                    더보기
                    </button>
                </div>
                </div>
            </div>
            </div>
        </section>

        {/* 인기 공개 플레이리스트 (투명 유리 박스 스타일) */}
        <section className="mb-6">
        <div className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 p-6 pb-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
            <div
                className="px-3 pt-2 text-2xl font-semibold text-[#f6f6f6] whitespace-nowrap transition"
            >
                인기 공개 플레이리스트
            </div>
            </div>

            <div className="mb-4 border-b border-white/10" />

            {/* 로딩/에러 상태 */}
            {playlistsLoading && <div className="p-8 text-white/50 text-lg">플레이리스트 로딩중...</div>}
            {playlistsError && <div className="p-8 text-red-400/80 text-lg">{playlistsError}</div>}

            {/* 플레이리스트 목록 */}
            {!playlistsLoading && !playlistsError && publicPlaylists.length > 0 && (
            <HorizontalScroller gradientFromClass="from-transparent">
            <div className="flex gap-2 min-w-max pr-2">
                {publicPlaylists.map((p) => (
                <button
                    key={p.playlist_id}
                    type="button"
                    onClick={() => navigate(`/playlist/${p.playlist_id}`)}
                    className="w-[260px] text-left group shrink-0"
                >
                    {/* 커버 */}
                    <div className="w-[260px] h-[260px] rounded-[32px] bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-500 shadow-xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    </div>

                    {/* 텍스트 */}
                    <div className="mt-5 px-2">
                        <div className="text-lg font-bold text-[#F6F6F6] truncate group-hover:text-[#AFDEE2] transition-colors">
                        {p.title}
                        </div>
                        <div className="mt-2 text-sm text-[#F6F6F6]/40 font-medium truncate">
                        {p.creator_nickname} · {p.item_count}곡 · ♥ {p.like_count}
                        </div>
                    </div>
                </button>
                ))}
            </div>
            </HorizontalScroller>
            )}

            {/* 데이터 없음 */}
            {!playlistsLoading && !playlistsError && publicPlaylists.length === 0 && (
                <div className="px-4 text-[#F6F6F6]/30 text-base text-left">인기 플레이리스트가 없습니다</div>
            )}
        </div>
        </section>
        </>
    );
}

export default HomePage;
