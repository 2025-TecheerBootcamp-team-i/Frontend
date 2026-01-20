import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { fetchPopularArtists, type PopularArtist } from "../../api/artist";
import { fetchChart, type ChartData, type ChartType, type ChartRow as ApiChartRow } from "../../api/chart";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

type PublicPlaylistPreview = {
        id: string;
        title: string;
        owner: string;
        trackCount: number;
};

const PUBLIC_PLAYLIST_PREVIEW: PublicPlaylistPreview[] = Array.from({ length: 10 }).map(
        (_, i) => ({
            id: `pub-${i + 1}`,
            title: `공개 플레이리스트 ${i + 1}`,
            owner: `사용자 ${i + 1}`,
            trackCount: 10 + i,
        })
);

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
        const [diffById, setDiffById] = useState<Record<string, number>>({});
    
        // ✅ 인기 아티스트 fetch (finally 추가해서 loading 정상 종료)
        useEffect(() => {
        let alive = true;
    
        (async () => {
            try {
            setPopularLoading(true);
            setPopularError(null);
    
            const data = await fetchPopularArtists(8);
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
    
        // ✅ 차트 fetch는 "하나만" 남기고 + diff 계산도 여기서 같이 처리
        useEffect(() => {
        let alive = true;
    
        (async () => {
            try {
            setChartLoading(true);
            setChartError(null);

            // ✅ Promise.allSettled로 변경: 일부 실패해도 성공한 것은 표시
            const results = await Promise.allSettled([
                fetchChart("realtime"),
                fetchChart("daily"),
                fetchChart("ai"),
            ]);
            if (!alive) return;

            const realtime = results[0].status === "fulfilled" ? results[0].value : null;
            const daily = results[1].status === "fulfilled" ? results[1].value : null;
            const ai = results[2].status === "fulfilled" ? results[2].value : null;

            // diff 계산 (realtime 기준)
            if (realtime) {
                const prev = prevRankByIdRef.current;
                const nextDiff: Record<string, number> = {};
                for (const item of realtime.items) {
                    const prevRank = prev[item.musicId];
                    nextDiff[item.musicId] = typeof prevRank === "number" ? prevRank - item.rank : 0;
                }
                setDiffById(nextDiff);

                // 다음 비교용 스냅샷 저장
                const nextPrev: Record<string, number> = {};
                for (const item of realtime.items) nextPrev[item.musicId] = item.rank;
                prevRankByIdRef.current = nextPrev;
            }

            setChartByType({ realtime, daily, ai });

            // ✅ 모두 실패한 경우에만 에러 표시
            if (!realtime && !daily && !ai) {
                setChartError("차트 데이터를 불러올 수 없습니다.");
            }
            } catch (e: unknown) {
            if (!alive) return;
            setChartError(getErrorMessage(e, "차트 로딩 실패"));
            } finally {
            setChartLoading(false);
            }
        })();
    
        return () => {
            alive = false;
        };
        }, []);


    const tabBtn = (key: "TOP100" | "DAILY" | "AI", label: string) => {
    const active = tab === key;
    return (
        <button
        type="button"
        onClick={() => setTab(key)}
        className={[
            "h-8 px-4 rounded-full text-sm transition whitespace-nowrap",
            active
            ? "bg-[#E4524D] text-[#F6F6F6]"
            : "bg-[#4d4d4d] text-[#F6F6F6] hover:bg-[#5d5d5d]",
        ].join(" ")}
        >
        {label}
        </button>
    );
    };

    const currentType = TAB_TO_CHARTTYPE[tab];
    const currentChart = chartByType[currentType];
    
    // ✅ musicId 기준 중복 제거
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
        title: row.musicName,
        artist: row.artistName,
        coverUrl: undefined, // 커버 URL이 API에 없으면 undefined
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
                className="flex gap-8 overflow-x-auto px-2 py-4 no-scrollbar scroll-smooth"
            >

        
        {popularLoading && <div className="text-[#F6F6F6]/70 px-2">로딩중...</div>}
        {popularError && <div className="text-red-300 px-2">{popularError}</div>}

                {!popularLoading && !popularError && popularArtists.map((a) => (
                <div
                    key={a.artist_id}
                    className="shrink-0 flex flex-col items-center animate-floatX"
                >
                    <button
                    type="button"
                    onClick={() => navigate(`/artists/${a.artist_id}`)}
                    className="
                        w-[140px] h-[140px] rounded-full bg-[#3d3d3d]
                        transition-all duration-300
                        hover:-translate-y-1 hover:scale-105
                        drop-shadow-md
                        overflow-hidden
                    "
                    >
                    {a.image_small_circle ? (
                        <img
                        src={a.image_small_circle}
                        alt={a.artist_name}
                        className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#F6F6F6] text-xl">
                        {a.artist_name?.[0] ?? "?"}
                        </div>
                    )}
                    </button>

                    <div className="mt-3 w-[140px] text-center break-words leading-snug text-sm text-[#F6F6F6]">{a.artist_name}</div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60">
                    #{a.rank} · {a.play_count}회
                    </div>
                </div>
                ))}
            </div>

            {showLeft && (
                <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-[#2d2d2d] to-transparent" />
            )}
            {showRight && (
                <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[#2d2d2d] to-transparent" />
            )}
            </div>
        </section>

        {/* 차트 요약 */}
        <section className="mb-4">
            <div className="rounded-3xl bg-[#2d2d2d]/80 p-6 pb-2">
            <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                {/* 상단 헤더 */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={goChart}
                        aria-label="전체 차트로 이동"
                        title="전체 차트"
                        className="px-3 text-xl font-semibold hover:text-[#888] text-[#F6F6F6] whitespace-nowrap transition"
                    >
                        실시간 차트
                    </button>

                    <div className="flex gap-2 shrink-0">
                        {tabBtn("TOP100", "TOP\u00A0100")}
                        {tabBtn("DAILY", "일일차트")}
                        {tabBtn("AI", "AI 음악")}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={goChart}
                    className="px-4 shrink-0 text-[#F6F6F6] hover:text-[#888] text-xl leading-none"
                    aria-label="전체 차트로 이동"
                    title="전체 차트"
                    >
                    <MdOutlineNavigateNext size={30} />
                    </button>
                </div>

                <div className="border-b border-[#464646]" />

                {chartLoading && <div className="p-4 text-[#F6F6F6]/70">차트 로딩중...</div>}
                {chartError && <div className="p-4 text-red-300">{chartError}</div>}

                {/* 리스트 */}
                <div className="divide-y divide-[#464646] overflow-hidden">
                    {previewRows.map((row) => (
                    <div
                        key={row.musicId}
                        className="
                        group w-full text-left grid
                        grid-cols-[60px_70px_1fr_1fr_80px]
                        items-center px-2 py-2
                        hover:bg-[#3d3d3d] transition
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
                            const diff = diffById[row.musicId] ?? 0;

                            if (diff > 0) return <span className="text-red-500">▲ {diff}</span>;
                            if (diff < 0) return <span className="text-blue-500">▼ {Math.abs(diff)}</span>;
                            return <span className="text-[#AAAAAA]">—</span>;
                        })()}
                        </div>

                        <div className="ml-5 flex items-center gap-4 min-w-0 truncate">
                        <div className="w-12 h-12 rounded-lg bg-[#D9D9D9]" />
                        <div className="text-sm text-[#F6F6F6] whitespace-nowrap">
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

                <div className="flex justify-center border-t border-[#464646] p-4 text-[#D9D9D9]">
                    <button
                    type="button"
                    onClick={goChart}
                    aria-label="전체 차트로 이동"
                    title="전체 차트"
                    className="hover:text-[#aaaaaa] transition"
                    >
                    더보기
                    </button>
                </div>
                </div>
            </div>
            </div>
        </section>

        {/* 인기 공개 플레이리스트 (레이아웃만) */}
        <section className="mb-6">
        <div className="rounded-3xl bg-[#2d2d2d]/80 p-6 pb-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
            <div
                className="px-3 text-xl font-semibold text-[#AFDEE2] whitespace-nowrap transition"
            >
                인기 공개 플레이리스트
            </div>
            </div>

            <div className="mb-4 border-b border-[#464646]" />

            {/* ✅ 여기부터 HorizontalScroller로 감싸기 */}
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]">
            <div className="flex gap-2 min-w-max pr-2">
                {PUBLIC_PLAYLIST_PREVIEW.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    className="w-[220px] text-left group shrink-0"
                >
                    {/* 커버 */}
                    <div className="w-[208px] h-[208px] rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />

                    {/* 텍스트 */}
                    <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                    {p.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {p.owner} · {p.trackCount}곡
                    </div>
                </button>
                ))}
            </div>
            </HorizontalScroller>
        </div>
        </section>


        </>
    );
}

export default HomePage;
