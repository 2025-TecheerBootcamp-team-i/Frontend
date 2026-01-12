    import { useRef, useState, useEffect } from "react";
    import { useNavigate } from "react-router-dom";
    import { TOP100, DAILY, AI } from "../../mocks/chart";

    import { MdOutlineNavigateNext } from "react-icons/md";
    import { FaPlay } from "react-icons/fa6";

    type Artist = { id: string; name: string };

    const artists: Artist[] = Array.from({ length: 8 }).map((_, i) => ({
    id: String(i + 1),
    name: `인기 아티스트 ${i + 1}`,
    }));

function HomePage() {
    const navigate = useNavigate();

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
                ? "bg-[#666666] text-white"
                : "bg-[#EAEAEA] text-[#666666] hover:bg-[#DCDCDC]",
            ].join(" ")}
        >
            {label}
        </button>
        );
    };

    const currentChart = tab === "DAILY" ? DAILY : tab === "AI" ? AI : TOP100;
    const previewRows = currentChart.slice(0, 6);

    return (
        <>
        {/* 인기 아티스트 */}
        <section className="mb-6">
            <div className="relative">
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto px-2 py-2 no-scrollbar"
            >
                {artists.map((a) => (
                <div
                    key={a.id}
                    className="
                    shrink-0 flex flex-col items-center
                    transition-all duration-300
                    hover:-translate-y-1 hover:scale-105 drop-shadow-md
                    animate-floatX
                    "
                >
                    <div className="w-32 h-32 rounded-full bg-[#D9D9D9]" />
                    <div className="mt-3 text-sm text-[#666666]">{a.name}</div>
                </div>
                ))}
            </div>

            {showLeft && (
                <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent" />
            )}
            {showRight && (
                <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent" />
            )}
            </div>
        </section>

        {/* 차트 요약 */}
        <section className="mb-6">
            <div className="rounded-2xl bg-[#F1F1F1] p-6 pb-2">
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
                        className="px-3 text-xl font-semibold text-[#666666] whitespace-nowrap transition"
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
                    className="px-4 shrink-0 text-[#666666] hover:text-[#333333] text-xl leading-none"
                    aria-label="전체 차트로 이동"
                    title="전체 차트"
                    >
                    <MdOutlineNavigateNext size={30} />
                    </button>
                </div>

                <div className="border-b border-[#D9D9D9]" />

                {/* 리스트 */}
                <div className="divide-y divide-[#D9D9D9] overflow-hidden">
                    {previewRows.map((row) => (
                    <div
                        key={row.id}
                        className="
                        group w-full text-left grid
                        grid-cols-[60px_70px_1fr_1fr_80px]
                        items-center px-2 py-3
                        hover:bg-[#F7F7F7] transition
                        "
                    >
                        {/* 순위 / 재생 버튼 */}
                        <div className="relative flex items-center justify-center">
                        <span className="text-sm text-[#333333] transition-opacity group-hover:opacity-0">
                            {row.rank}
                        </span>

                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/track/${row.id}`)
                            }}
                            className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#666666]">
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
                        <div className="text-sm text-[#333333] whitespace-nowrap">
                            {row.title}
                            {row.isAI && (
                                <span className="shrink-0 ml-3 text-xs px-2 py-[2px] rounded-full bg-[#ECECEC] text-[#666666]">
                                AI
                                </span>
                            )}
                        </div>
                        </div>

                        <div className="hidden sm:block text-sm text-[#666666] whitespace-nowrap">
                        {row.artist}
                        </div>

                        <div className="text-right pr-6 text-sm text-[#666666] whitespace-nowrap">
                        {row.duration}
                        </div>
                    </div>
                    ))}
                </div>

                <div className="flex justify-center border-t p-4 text-[#D9D9D9]">
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
        </>
    );
    }

    export default HomePage;
