import { useMemo } from "react";
import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

/* =====================
mock DB (아티스트별 데이터)
===================== */
type Track = { id: string; title: string; album: string; duration: string };
type Album = { id: string; title: string; year: string };

type ArtistData = {
    id: string;
    name: string;
    tracks: Track[];
    albums: Album[];
    };

    type HorizontalScrollerProps = {
        children: React.ReactNode;
        scrollStep?: number;
        gradientFromClass?: string; // 배경색 맞추기
    };
    
    function HorizontalScroller({
        children,
        scrollStep = 300,
        gradientFromClass = "from-[#2d2d2d]/80", // ✅ Section 배경이랑 맞춤
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
                "
                aria-label="왼쪽으로 이동"
            >
                <MdOutlineNavigateNext className="rotate-180" size={22} />
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

const ARTISTS: Record<string, ArtistData> = {
    a1: {
        id: "a1",
        name: "아티스트 A",
        tracks: [
            { id: "a1-t1", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
            { id: "a1-t2", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
            { id: "a1-t3", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },
        ],
        albums: [
        { id: "a1-al1", title: "A - 앨범 1", year: "2024" },
        { id: "a1-al2", title: "A - 앨범 2", year: "2023" },
        { id: "a1-al3", title: "A - 앨범 3", year: "2022" },
        { id: "a1-al4", title: "A - 앨범 4", year: "2021" },
        ],
    },
    a2: {
        id: "a2",
        name: "아티스트 B",
        tracks: [
        { id: "a2-t1", title: "B - 인기곡 1", album: "B - 앨범 1", duration: "3:01" },
        { id: "a2-t2", title: "B - 인기곡 2", album: "B - 앨범 2", duration: "2:45" },
        { id: "a2-t3", title: "B - 인기곡 3", album: "B - 앨범 3",duration: "4:10" },
        ],
        albums: [
        { id: "a2-al1", title: "B - 미니 1집", year: "2025" },
        { id: "a2-al2", title: "B - 정규 1집", year: "2024" },
        { id: "a2-al3", title: "B - 싱글 모음", year: "2023" },
        { id: "a2-al4", title: "B - EP", year: "2022" },
        ],
    },
};

export default function ArtistPage() {
    const { artistId } = useParams();
    const navigate = useNavigate();

    const artist = useMemo(() => {
        const id = artistId ?? "";
        return ARTISTS[id];
    }, [artistId]);

    // ✅ artistId가 없거나, DB에 없는 경우
    if (!artist) {
        return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
            <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 text-[#aaa] hover:text-white transition"
            aria-label="뒤로가기"
            >
            <IoChevronBack size={24} />
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xl font-semibold">아티스트를 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{artistId ?? "(없음)"}</span>
            </div>

            <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-5 px-4 py-2 rounded-full bg-[#E4524D] text-white font-semibold hover:opacity-90 transition"
            >
                홈으로
            </button>
            </div>
        </div>
        );
    }

    return (
        <div className="w-full min-w-0 overflow-x-auto">
        {/* 상단 */}
        <section className="relative mb-16 overflow-visible">
            <div className="relative h-72 bg-[#1D1D1D]/70 border-b border-[#3D3D3D] overflow-hidden">
                {/* 상단 왼쪽 뒤로 */}
                <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-4 top-5 z-10 p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
                title="뒤로가기"
                >
                <IoChevronBack size={22} />
                </button>

                {/* 내용 */}
                <div className="absolute inset-0 flex items-end">
                <div className="px-10 pb-8 flex items-end gap-10 min-w-[1100px] shrink-0">
                    {/* ✅ 이미지 자리는 유지(레이아웃 안 흔들리게) */}
                    <div className="w-48 h-48 shrink-0" />

                    {/* 텍스트 + 플레이 */}
                    <div className="flex items-end gap-5">
                    <div>
                        <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none">
                        {artist.name}
                        </div>
                        <div className="mt-2 text-sm text-[#F6F6F6]/60">아티스트</div>
                    </div>

                    <button
                        type="button"
                        className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                        aria-label="아티스트 재생"
                        title="재생"
                    >
                        <FaPlay size={16} />
                    </button>
                    </div>
                </div>
                </div>
            </div>

            {/* ✅ 헤더 밖에서 그리기: 아래 컨텐츠까지 걸치게 */}
            <div
                className="
                absolute left-10 top-32
                w-52 h-52
                rounded-full bg-[#777777]
                z-20
                shadow-xl
                pointer-events-none
                "
            />
        </section>


        {/* 아래 컨텐츠 */}
        <div className="mt-6 px-4 space-y-6">
            {/* 곡 카드 */}
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <button 
                onClick={() => navigate(`/artists/${artist.id}/tracks`)}
                className="px-3 text-xl font-semibold hover:text-[#888] text-[#F6F6F6] whitespace-nowrap transition">곡</button>
                <button
                type="button"
                onClick={() => navigate(`/artists/${artist.id}/tracks`)}
                className="px-3 shrink-0 text-[#F6F6F6] hover:text-[#888] text-xl leading-non"
                aria-label="곡 더보기"
                title="더보기"
                >
                <MdOutlineNavigateNext size={28} />
                </button>
            </div>

            <div className="mx-6 border-b border-[#464646]" />

            {/* 테이블 */}
            <div className="px-6 pb-3">
                {artist.tracks.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/track/${t.id}`)}
                    className={[
                    "w-full text-left",
                    "grid grid-cols-[56px_1fr_90px] min-[1200px]:grid-cols-[56px_1fr_100px_450px] items-center",
                    "py-3 px-2",
                    "border-b border-[#464646]",
                    "hover:bg-white/5 transition",
                    ].join(" ")}
                >
                    <div className="w-10 h-10 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]" />

                    <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                        {t.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                        {artist.name}
                    </div>
                    </div>
                    <div className="hidden min-[1200px]:block text-sm text-[#F6F6F6]/70 text-right">{t.album}</div>
                    <div className="text-sm text-[#F6F6F6]/70 text-right">{t.duration}</div>
                </button>
                ))}
                <div className="flex justify-center border-[#464646] p-4 text-[#D9D9D9]">
                    <button
                    onClick={() => navigate(`/artists/${artist.id}/tracks`)}
                    type="button"
                    aria-label="전체 곡으로 이동"
                    title="전체 곡"
                    className="hover:text-[#aaaaaa] text-xs transition"
                    >
                    더보기
                    </button>
                </div>
            </div>
            </section>

            {/* 앨범 카드 */}
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <button 
                onClick={() => navigate(`/artists/${artist.id}/albums`)}
                className="px-3 text-lg font-semibold hover:text-[#888] text-[#F6F6F6] whitespace-nowrap transition">앨범</button>
                <button
                onClick={() => navigate(`/artists/${artist.id}/albums`)}
                type="button"
                className="px-3 shrink-0 text-[#F6F6F6] hover:text-[#888] text-xl leading-non"
                aria-label="앨범 더보기"
                title="더보기"
                >
                <MdOutlineNavigateNext size={28} />
                </button>
            </div>

            <div className="mx-6 border-b border-[#464646]" />

            {/* 앨범 그리드 */}
            <div className="px-6 pb-6">
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
                <div className="flex gap-5 min-w-max pr-2 pt-2">
                {artist.albums.map((al) => (
                    <button
                    key={al.id}
                    type="button"
                    onClick={() => navigate(`/album/${al.id}`)}
                    className="w-[180px] text-left group shrink-0"
                    >
                    <div className="aspect-square rounded-2xl bg-[#6b6b6b]/30 border border-[#464646] group-hover:bg-[#6b6b6b]/45 transition" />
                    <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                        {al.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                        {al.year}
                    </div>
                    </button>
                ))}
                </div>
            </HorizontalScroller>
            </div>

            </section>
        </div>
    </div>
    );
}
