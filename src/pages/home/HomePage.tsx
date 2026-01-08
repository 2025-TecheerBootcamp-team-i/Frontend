import Header from "../../components/layout/Header";
import Sidebar from "../../components/layout/Sidebar";
import Player from "../../components/layout/Player";
import { useRef, useState, useEffect } from "react";

type Artist = { id: string; name: string };
type ChartRow = { id: string; rank: number; title: string; artist: string; album: string };

const artists: Artist[] = Array.from({ length: 6 }).map((_, i) => ({
    id: String(i + 1),
    name: `인기 아티스트 ${i + 1}`,
}));

const chart: ChartRow[] = Array.from({ length: 8 }).map((_, i) => ({
    id: String(i + 1),
    rank: i + 1,
    title: "곡 명",
    artist: "아티스트명",
    album: "앨범명",
}));


function HomePage() {
    // Hooks
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
    
        const update = () => {
        const { scrollLeft, scrollWidth, clientWidth } = el;
    
        // 왼쪽에 더 내용 있음?
        setShowLeft(scrollLeft > 0);
    
        // 오른쪽에 더 내용 있음?
        setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
        };
    
        update(); // 최초 1번
        el.addEventListener("scroll", update);
        window.addEventListener("resize", update);
    
        return () => {
        el.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
        };
    }, []);

    return (
        <div 
            className="
                h-screen
                bg-[#ffffff]
            "
        >
            
            { /* 헤더 */ }
            <div
                className="flex-1 flex flex-col">
                    <Header />
                </div>

            <div className="flex flex-1 min-h-0">
            { /* 사이드바 */ }
            <Sidebar />

            { /* 메인 */ }
            <main className="flex-1 min-h-0 overflow-auto p-6">
                { /* 인기 아티스트 */ }
                <section className="mb-6">
                    <div className="relative">
                        { /* 스크롤 영역 */ }
                        <div ref={scrollRef} className="
                            flex gap-6
                            overflow-x-auto
                            pb-2
                        ">{artists.map((a) => (
                            <div key={a.id} className="shrink-0 flex flex-col items-center">
                                <div className="w-28 h-28 rounded-full bg-[#D9D9D9]" />
                                <div className="mt-3 text-sm text-[#666666]">{a.name}</div>
                            </div>
                        ))}
                        </div>

                        {/* 왼쪽 그라데이션 (스크롤했을 때만) */}
                        {showLeft && (
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent" />
                        )}

                        {/* 오른쪽 그라데이션 (끝이 아닐 때만) */}
                        {showRight && (
                            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent" />
                        )}
                    </div>
                </section>

            </main>
            </div>


        </div>

    )
}

export default HomePage;