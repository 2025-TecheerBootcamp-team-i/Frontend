import { useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { IoChevronBack } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import type { Playlist } from "../../components/layout/MainLayout";

type LayoutCtx = { playlists: Playlist[] };

type TopRow = {
    id: string;
    rank: number;
    title: string;
    artist: string;
    total: number;
};

const top50Preview: TopRow[] = [
    { id: "1", rank: 1, title: "곡 명", artist: "아티스트명", total: 63 },
    { id: "2", rank: 2, title: "곡 명", artist: "아티스트명", total: 59 },
    { id: "3", rank: 3, title: "곡 명", artist: "아티스트명", total: 34 },
    { id: "4", rank: 4, title: "곡 명", artist: "아티스트명", total: 30 },
    { id: "5", rank: 5, title: "곡 명", artist: "아티스트명", total: 27 },
    { id: "6", rank: 6, title: "곡 명", artist: "아티스트명", total: 19 },
    { id: "7", rank: 7, title: "곡 명", artist: "아티스트명", total: 1 },
    { id: "8", rank: 8, title: "곡 명", artist: "아티스트명", total: 1 },
];

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

export default function MyPage() {
    const { playlists } = useOutletContext<LayoutCtx>();
    const navigate = useNavigate();

    const { setTrackAndPlay } = usePlayer();

    const toTrack = (r: TopRow): PlayerTrack => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    audioUrl: "/audio/sample.mp3", // ✅ 임시(나중에 실제 URL로 교체)
    // coverUrl 필요하면 추가:
    // coverUrl: "/images/sample.jpg",
    });


    // ✅ 추가: 분석 대시보드 탭 상태
    const [range, setRange] = useState<"month" | "all">("month");

    // ✅ (예시) 탭별로 보여줄 데이터만 갈아끼우기
    const dashboard =
        range === "month"
        ? {
            listen: { value: "123시간", sub: "지난달 대비 +12%" },
            genre: { value: "Indie", sub: "2위: Pop" },
            ai: { value: "3곡", sub: "최근 생성: 2일 전" },
            insight: {
                main1: "밤 시간대",
                main2: "잔잔한 음악",
                text: "이번 달은",
            },
            }
        : {
            listen: { value: "1,240시간", sub: "누적 청취 시간" },
            genre: { value: "Pop", sub: "2위: Indie" },
            ai: { value: "28곡", sub: "누적 생성: 최근 생성 5일 전" },
            insight: {
                main1: "오후 시간대",
                main2: "업템포/댄스",
                text: "전체 기간 기준으로는",
            },
            };

    // ✅ 버튼 스타일 함수 (중복 줄이기)
    const tabBtn = (key: "month" | "all", label: string) => {
        const active = range === key;
        return (
        <button
            type="button"
            onClick={() => setRange(key)}
            aria-pressed={active}
            className={[
            "h-9 px-4 rounded-full text-sm border border-[#2d2d2d] transition",
            active
                ? "bg-[#E4524D] text-[#F6F6F6]"
                : "bg-[#3d3d3d] text-[#F6F6F6]/80 hover:text-[#F6F6F6] hover:bg-[#3d3d3d]/80",
            ].join(" ")}
        >
            {label}
        </button>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
        {/* 타이틀 라인 */}
        <div className="sticky top-0 z-20 pt-2 mb-4">
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>
            <h1 className="text-2xl font-semibold text-[#F6F6F6]">마이페이지</h1>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="w-full min-w-[1050px] mx-auto">
            {/* 본문: 고정 2컬럼 */}
            <div className="pt-6 grid grid-cols-12 gap-6">
                {/* 좌측 */}
                <section className="col-span-6 space-y-6">
                {/* ✅ 프로필 + 분석 */}
                <div className="space-y-6">
                    {/* 프로필 카드 */}
                    <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-6">
                    <div className="flex items-center gap-6">
                        <div className="w-28 h-28 rounded-full bg-[#777777]" />

                        <div className="min-w-0">
                        <div className="text-2xl font-semibold text-[#F6F6F6]">
                            Name
                        </div>

                        <div className="mt-3 text-sm text-[#F6F6F6] space-y-2">
                            <button
                            type="button"
                            onClick={() => alert("수정 및 설정(준비중)")}
                            className="flex items-center gap-1 hover:underline text-[#F6F6F6]"
                            >
                            <IoIosSettings size={20} />
                            수정 및 설정
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>

                    {/* 분석 대시보드 카드 */}
                    <div
                    className="
                        rounded-3xl p-[2px]
                        bg-gradient-to-r
                        from-[#2d2d2d]
                        via-[#5a5a5a]
                        to-[#2d2d2d]
                    "
                    >
                    <div className="rounded-3xl bg-[#2d2d2d]/80 p-6">
                        <div className="flex items-center justify-between">
                        <div className="px-2 text-2xl font-semibold text-[#F6F6F6]">
                            개인 음악 분석 데이터
                        </div>

                        {/* ✅ 여기: 버튼 클릭하면 탭 넘어가게 */}
                        <div className="px-2 flex gap-2">
                            {tabBtn("month", "이번 달")}
                            {tabBtn("all", "전체")}
                        </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-sm text-[#999999]">
                            {range === "month" ? "이번 달 청취" : "누적 청취"}
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-[#F6F6F6]">
                            {dashboard.listen.value}
                            </div>
                            <div className="mt-2 text-xs text-[#999999]">
                            {dashboard.listen.sub}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-sm text-[#999999]">Top 장르</div>
                            <div className="mt-2 text-2xl font-semibold text-[#AFDEE2]">
                            {dashboard.genre.value}
                            </div>
                            <div className="mt-2 text-xs text-[#999999]">
                            {dashboard.genre.sub}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-sm text-[#999999]">
                            AI 생성 활동
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-[#F6F6F6]">
                            {dashboard.ai.value}
                            </div>
                            <div className="mt-2 text-xs text-[#999999]">
                            {dashboard.ai.sub}
                            </div>
                        </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4">
                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-base font-semibold text-[#F6F6F6] mb-3">
                            Top 아티스트
                            </div>

                            <div className="space-y-3">
                            {["아티스트A", "아티스트B", "아티스트C"].map((name, i) => (
                                <div key={name} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#777777]" />

                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-[#F6F6F6] truncate">
                                    {i + 1}. {name}
                                    </div>
                                    <div className="text-xs text-[#999999]">
                                    반복 재생 높음
                                    </div>
                                </div>

                                <div className="text-sm font-semibold text-[#F6F6F6]/80 whitespace-nowrap">
                                    {Math.max(1, 12 - i * 4)}%
                                </div>
                                </div>
                            ))}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-base font-semibold text-[#F6F6F6] mb-3">
                            분위기/키워드
                            </div>

                            <div className="flex flex-wrap gap-2">
                            {["새벽감성", "잔잔함", "집중", "드라이브", "감성팝", "힐링"].map(
                                (t) => (
                                <span
                                    key={t}
                                    className="
                                    px-3 py-2 rounded-full
                                    bg-[#3d3d3d] border border-[#2d2d2d]
                                    text-sm text-[#AFDEE2]/85
                                    "
                                >
                                    {t}
                                </span>
                                )
                            )}
                            </div>
                        </div>
                        </div>

                        <div className="mt-5 rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4 text-center">
                        <div className="text-sm text-[#999999]">
                            {range === "month" ? "이번 달 인사이트" : "전체 인사이트"}
                        </div>
                        <div className="mt-2 text-base text-[#F6F6F6]">
                            {dashboard.insight.text}{" "}
                            <span className="font-semibold text-[#AFDEE2]">
                            {dashboard.insight.main1}
                            </span>
                            에{" "}
                            <span className="font-semibold text-[#AFDEE2]">
                            {dashboard.insight.main2}
                            </span>
                            을(를) 더 자주 들었어요 🎧
                        </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* 나의 플레이리스트 */}
                <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-6">
                    <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-1 text-xl hover:text-white transition font-semibold text-[#F6F6F6]"
                    >
                        나의 플레이리스트
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-1 text-[#F6F6F6] hover:text-white transition"
                        aria-label="플레이리스트 더보기"
                        title="더보기"
                    >
                        <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="mt-3 border-b border-[#464646]" />

                    <HorizontalScroller gradientFromClass="from-[#2d2d2d]">
                    <div className="flex gap-1 w-max">
                        {playlists.slice(0, 12).map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => navigate(`/playlist/${p.id}`)}   // ✅ 상세 연결
                            className="
                            w-[145px]
                            shrink-0
                            flex flex-col
                            rounded-xl
                            hover:bg-white/5
                            transition
                            p-2
                            text-left
                            "
                        >
                            <div className="w-full aspect-square rounded-xl bg-[#777777] overflow-hidden">
                                {p.coverUrl ? (
                                    <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover" />
                                ) : null}
                            </div>

                            <div className="mt-3">
                                <div className="text-sm font-medium text-[#F6F6F6] truncate">{p.title}</div>
                            </div>
                        </button>
                        ))}
                    </div>
                    </HorizontalScroller>

                </div>

                {/* 나의 AI 생성곡 */}
                <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-6">
                    <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/ai")}
                        className="px-1 text-xl hover:text-white transition font-semibold text-[#F6F6F6]"
                    >
                        나의 AI 생성곡
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/ai")}
                        className="px-1 text-[#F6F6F6] hover:text-white transition"
                        aria-label="AI 생성곡 더보기"
                        title="더보기"
                    >
                        <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="mt-3 border-b border-[#464646]" />

                    <HorizontalScroller gradientFromClass="from-[#2d2d2d]">
                    <div className="flex gap-1 w-max">
                        {Array.from({ length: 12 }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => alert("AI 곡 상세(준비중)")}
                            className="
                            w-[145px]
                            shrink-0
                            flex flex-col
                            rounded-xl
                            hover:bg-white/5
                            transition
                            p-2
                            text-left
                            "
                        >
                            <div className="w-full aspect-square rounded-xl bg-[#777777]" />

                            <div className="mt-3">
                            <div className="text-sm font-medium text-[#F6F6F6] truncate">
                                곡 명
                            </div>
                            <div className="mt-1 text-xs text-[#999999] truncate">
                                생성일
                            </div>
                            </div>
                        </button>
                        ))}
                    </div>
                    </HorizontalScroller>
                </div>
                </section>

                {/* 우측 */}
                <aside className="col-span-6 rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80">
                <h2 className="px-8 pt-6 text-xl font-semibold text-[#F6F6F6]">
                    실시간 나의 TOP 50 차트
                </h2>

                <div className="mt-4 border-b border-[#464646]" />

                <div className="mt-3 px-8 grid grid-cols-[100px_200px_1fr] items-center text-sm text-[#F6F6F6]/80">
                    <div className="border-l border-[#f6f6f6]/20 pl-2">순위</div>
                    <div className="border-l border-[#f6f6f6]/20 pl-2">곡정보</div>
                    <div className="border-l border-[#f6f6f6]/20 pl-2">
                    총 들은 수
                    </div>
                </div>

                <div className="mt-3 border-b border-[#464646]" />

                <div className="divide-y divide-[#464646]">
                    {top50Preview.map((r, idx) => (
                    <div
                        key={r.id}
                        className="
                        group
                        w-full
                        text-left
                        transition
                        hover:bg-white/5
                        "
                    >
                        <div
                        className={[
                            "grid grid-cols-[100px_200px_1fr] items-center px-8 py-2.5",
                            idx % 2 === 0 ? "bg-[#3d3d3d]/80" : "bg-[#2d2d2d]/80",
                        ].join(" ")}
                        >
                        {/* ✅ 순위 (행 hover 시 아이콘으로 전환) */}
                        <div className="border-l border-[#464646] text-left font-semibold text-[#F6F6F6]">
                            <div className="flex items-center gap-3">
                            <div className="relative w-8 flex items-center justify-center">
                                {/* 기본: 순위 */}
                                <span className="text-sm transition-opacity group-hover:opacity-0">
                                {r.rank}
                                </span>

                                {/* hover: 재생 아이콘 */}
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTrackAndPlay(toTrack(r)); // ✅ 하단 플레이어 세팅+재생
                                    }}
                                    className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#AFDEE2]"
                                    aria-label={`${r.title} 재생`}
                                    title="재생"><FaPlay />
                                </button>
                            </div>
                            </div>
                        </div>

                        {/* 곡정보 */}
                        <div className="pl-2 min-w-0 border-l border-[#464646]">
                            <div className="flex items-center gap-5 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-xl bg-[#777777]" />
                            <div className="min-w-0">
                                <div className="truncate text-sm text-[#F6F6F6]">
                                {r.title}
                                </div>
                                <div className="truncate text-xs text-[#999999]">
                                {r.artist}
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* 총 들은 수 */}
                        <div className="border-l border-[#464646] pl-2 text-left text-sm font-semibold text-[#F6F6F6] whitespace-nowrap">
                            {r.total}번
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                </aside>
            </div>
            </div>
        </div>
        </div>
    );
}
