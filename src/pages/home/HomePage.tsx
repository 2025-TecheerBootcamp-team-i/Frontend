import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TOP100, DAILY, AI } from "../../mocks/chart";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

type Artist = { id: string; name: string };

const artists: Artist[] = Array.from({ length: 8 }).map((_, i) => ({
    id: String(i + 1),
    name: `인기 아티스트 ${i + 1}`,
}));

type ChartRow =
    | (typeof TOP100)[number]
    | (typeof DAILY)[number]
    | (typeof AI)[number];

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



function HomePage() {
    const navigate = useNavigate();
    const { setTrackAndPlay } = usePlayer();

    const goChart = () => {
        const map = { TOP100: "top100", DAILY: "daily", AI: "ai" } as const;
        navigate(`/chart/${map[tab]}`);
    };
    
    const [tab, setTab] = useState<"TOP100" | "DAILY" | "AI">("TOP100");

    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const update = () => {
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setShowLeft(scrollLeft > 0);
        setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
        };

        update();
        el.addEventListener("scroll", update);
        window.addEventListener("resize", update);

        return () => {
        el.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
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

    const currentChart = tab === "DAILY" ? DAILY : tab === "AI" ? AI : TOP100;
    const previewRows = currentChart.slice(0, 6);

    const toTrack = (row: ChartRow): PlayerTrack => {
            const coverUrl =
            "coverUrl" in row && typeof row.coverUrl === "string" ? row.coverUrl : undefined;
        
            const audioUrl =
            "audioUrl" in row && typeof row.audioUrl === "string"
                ? row.audioUrl
                : "/audio/sample.mp3";
        
            return {
            id: row.id,
            title: row.title,
            artist: row.artist,
            coverUrl,
            audioUrl,
            duration: row.duration,
            // album 있으면 추가 가능:
            // album: "album" in row && typeof row.album === "string" ? row.album : undefined,
            };
    };
    
    return (
        <>
        {/* 인기 아티스트 */}
        <section className="mb-6">
            <div className="relative">
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto px-2 py-4 no-scrollbar scroll-smooth"
            >
                {artists.map((a) => (
                <div
                    key={a.id}
                    className="
                    shrink-0 flex flex-col items-center animate-floatX">
                        <button 
                            type="button"
                            onClick={() => navigate(`/artists/a${a.id}`)} // 임시
                            className="
                                w-32 h-32 rounded-full bg-[#777777]
                                transition-all duration-300
                                hover:-translate-y-1 hover:scale-105
                                drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]
                                " />
                    <div className="mt-3 text-sm text-[#F6F6F6]">{a.name}</div>
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
        <section className="mb-6">
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

                {/* 리스트 */}
                <div className="divide-y divide-[#464646] overflow-hidden">
                    {previewRows.map((row) => (
                    <div
                        key={row.id}
                        className="
                        group w-full text-left grid
                        grid-cols-[60px_70px_1fr_1fr_80px]
                        items-center px-2 py-3
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
                        {row.diff > 0 && <span className="text-red-500">▲ {row.diff}</span>}
                        {row.diff < 0 && (
                            <span className="text-blue-500">▼ {Math.abs(row.diff)}</span>
                        )}
                        {row.diff === 0 && <span className="text-[#AAAAAA]">—</span>}
                        </div>

                        <div className="ml-5 flex items-center gap-4 min-w-0 truncate">
                        <div className="w-10 h-10 rounded-lg bg-[#D9D9D9]" />
                        <div className="text-sm text-[#F6F6F6] whitespace-nowrap">
                            {row.title}
                            {row.isAI && (
                                <span className="shrink-0 ml-3 text-xs px-2 py-[1px] rounded-full bg-[#E4524D]/20 text-[#E4524D]">
                                AI
                                </span>
                            )}
                        </div>
                        </div>

                        <div className="hidden sm:block text-sm text-[#F6F6F6] whitespace-nowrap">
                        {row.artist}
                        </div>

                        <div className="text-right pr-6 text-sm text-[#F6F6F6] whitespace-nowrap">
                        {row.duration}
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
            <button
                type="button"
                onClick={() => navigate("/search")}
                className="px-3 text-xl font-semibold hover:text-[#87B2B6] text-[#AFDEE2] whitespace-nowrap transition"
            >
                인기 공개 플레이리스트
            </button>

            <button
                type="button"
                onClick={() => navigate("/search")}
                className="px-4 shrink-0 text-[#AFDEE2] hover:text-[#87B2B6] text-xl leading-none"
                aria-label="인기 공개 플레이리스트 더보기"
                title="더보기"
            >
                <MdOutlineNavigateNext size={30} />
            </button>
            </div>

            <div className="mb-4 border-b border-[#464646]" />

            {/* ✅ 여기부터 HorizontalScroller로 감싸기 */}
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]">
            <div className="flex gap-5 min-w-max pr-2">
                {PUBLIC_PLAYLIST_PREVIEW.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    className="w-[220px] text-left group shrink-0"
                >
                    {/* 커버 */}
                    <div className="w-48 h-48 rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />

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
