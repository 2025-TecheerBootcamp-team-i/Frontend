import { useNavigate } from "react-router-dom";

import { IoChevronBack } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import { FaUserFriends } from "react-icons/fa";
import { MdOutlineNavigateNext } from 'react-icons/md';


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

export default function MyPage() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-full flex flex-col">
        {/* 타이틀 라인 */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E0E0E0] py-3">
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 text-[#666666] rounded-full hover:bg-gray-100"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>
            <h1 className="text-2xl font-semibold text-[#666666]">마이페이지</h1>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="w-[1050px] mx-auto">
            {/* 본문: 고정 2컬럼 */}
            <div className="pt-6 grid grid-cols-12 gap-6">
                {/* 좌측 */}
                <section className="col-span-6 space-y-6">
                {/* ✅ 프로필 + 분석 (프로필 위 / 대시보드 아래) */}
                <div className="space-y-6">
                    {/* 프로필 카드 */}
                    <div className="rounded-2xl border border-[#E6E6E6] bg-white p-6">
                    <div className="flex items-center gap-6">
                        <div className="w-28 h-28 rounded-full bg-[#D9D9D9]" />

                        <div className="min-w-0">
                        <div className="text-2xl font-semibold text-[#666666]">Name</div>

                        <div className="mt-3 text-sm text-[#666666] space-y-2">
                            <button
                            type="button"
                            onClick={() => alert("수정 및 설정(준비중)")}
                            className="flex items-center gap-1 hover:underline"
                            ><IoIosSettings size={20}/>
                            수정 및 설정
                            </button>

                            <button
                            type="button"
                            onClick={() => alert("친구 목록(준비중)")}
                            className="flex items-center gap-2 hover:underline"
                            ><FaUserFriends size={20}/>
                            친구 목록
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>

                    {/* 분석 대시보드 카드 (그라데이션 테두리) */}
                    <div
                    className="
                        rounded-2xl p-[2px]
                        bg-gradient-to-r
                        from-[#E7E7E7]
                        via-[#D0D0D0]
                        to-[#F0F0F0]
                    "
                    >
                    <div className="rounded-2xl bg-[#F3F3F3] p-6">
                        {/* 상단: 타이틀 + 기간 토글 */}
                        <div className="flex items-center justify-between">
                        <div className="px-2 text-2xl font-semibold text-[#666666]">
                            개인 음악 분석 데이터
                        </div>

                        <div className="px-2 flex gap-2">
                            <button
                            type="button"
                            className="h-9 px-4 rounded-full bg-white text-[#666666] text-sm border border-[#E6E6E6]"
                            >
                            이번 달
                            </button>
                            <button
                            type="button"
                            className="h-9 px-4 rounded-full bg-[#EAEAEA] text-[#666666] text-sm border border-[#E6E6E6]"
                            >
                            전체
                            </button>
                        </div>
                        </div>

                        {/* KPI 3개 */}
                        <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="rounded-2xl bg-white border border-[#E6E6E6] p-4">
                            <div className="text-sm text-[#999999]">이번 달 청취</div>
                            <div className="mt-2 text-2xl font-semibold text-[#666666]">123시간</div>
                            <div className="mt-2 text-xs text-[#AAAAAA]">지난달 대비 +12%</div>
                        </div>

                        <div className="rounded-2xl bg-white border border-[#E6E6E6] p-4">
                            <div className="text-sm text-[#999999]">Top 장르</div>
                            <div className="mt-2 text-2xl font-semibold text-[#666666]">Indie</div>
                            <div className="mt-2 text-xs text-[#AAAAAA]">2위: Pop</div>
                        </div>

                        <div className="rounded-2xl bg-white border border-[#E6E6E6] p-4">
                            <div className="text-sm text-[#999999]">AI 생성 활동</div>
                            <div className="mt-2 text-2xl font-semibold text-[#666666]">3곡</div>
                            <div className="mt-2 text-xs text-[#AAAAAA]">최근 생성: 2일 전</div>
                        </div>
                        </div>

                        {/* 아래: Top 아티스트 / 분위기 키워드 */}
                        <div className="mt-5 grid grid-cols-2 gap-4">
                        {/* Top Artist */}
                        <div className="rounded-2xl bg-white border border-[#E6E6E6] p-4">
                            <div className="text-base font-semibold text-[#666666] mb-3">
                            Top 아티스트
                            </div>

                            <div className="space-y-3">
                            {["아티스트A", "아티스트B", "아티스트C"].map((name, i) => (
                                <div key={name} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#D9D9D9]" />

                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-[#666666] truncate">
                                    {i + 1}. {name}
                                    </div>
                                    <div className="text-xs text-[#AAAAAA]">반복 재생 높음</div>
                                </div>

                                <div className="text-sm font-semibold text-[#888888] whitespace-nowrap">
                                    {Math.max(1, 12 - i * 4)}%
                                </div>
                                </div>
                            ))}
                            </div>
                        </div>

                        {/* Mood Tags */}
                        <div className="rounded-2xl bg-white border border-[#E6E6E6] p-4">
                            <div className="text-base font-semibold text-[#666666] mb-3">
                            분위기/키워드
                            </div>

                            <div className="flex flex-wrap gap-2">
                            {["새벽감성", "잔잔함", "집중", "드라이브", "감성팝", "힐링"].map(
                                (t) => (
                                <span
                                    key={t}
                                    className="
                                    px-3 py-2 rounded-full
                                    bg-[#F3F3F3] border border-[#E6E6E6]
                                    text-sm text-[#666666]
                                    "
                                >
                                    {t}
                                </span>
                                )
                            )}
                            </div>
                        </div>
                        </div>

                        {/* 하단 인사이트 */}
                        <div className="mt-5 rounded-2xl bg-white border border-[#E6E6E6] p-4 text-center">
                        <div className="text-sm text-[#999999]">이번 달 인사이트</div>
                        <div className="mt-2 text-base text-[#666666]">
                            이번 달은 <span className="font-semibold">밤 시간대</span>에
                            <span className="font-semibold"> 잔잔한 음악</span>을 더 자주 들었어요
                            🎧
                        </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* 나의 플레이리스트 */}
                <div className="rounded-2xl border border-[#E6E6E6] bg-white p-6">
                    <div className="flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="
                            px-1 text-xl hover:text-[#888] transition font-semibold text-[#666666]"
                        >나의 플레이리스트</button>

                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-1 text-[#666] hover:text-[#888] transition"
                        aria-label="플레이리스트 더보기"
                        title="더보기"
                    >
                    <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="mt-3 border-b border-[#E6E6E6]" />
                    
                    <div className="mt-2 overflow-x-auto overflow-y-hidden">
                        <div className="flex gap-1 w-max">
                            {Array.from({ length: 12 }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => alert("플레이리스트 상세(준비중)")}
                                className="
                                w-[145px]
                                shrink-0
                                flex flex-col
                                rounded-xl
                                hover:bg-[#F5F5F5]
                                transition
                                p-2
                                text-left
                                "
                            >
                                {/* 커버 */}
                                <div className="w-full aspect-square rounded-xl bg-[#D9D9D9]" />

                                {/* 텍스트 */}
                                <div className="mt-3">
                                <div className="text-sm font-medium text-[#666666] truncate">
                                    플리명
                                </div>
                                <div className="mt-1 text-xs text-[#9A9A9A] truncate">
                                    by 제작자
                                </div>
                                </div>
                            </button>
                            ))}
                        </div>
                        </div>
                    </div>

                {/* 나의 AI 생성곡 */}
                <div className="rounded-2xl border border-[#E6E6E6] bg-white p-6">
                    <div className="flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={() => navigate("/ai")}
                        className="
                            px-1 text-xl hover:text-[#888] transition font-semibold text-[#666666]"
                        >나의 AI 생성곡</button>

                    <button
                        type="button"
                        onClick={() => navigate("/ai")}
                        className="px-1 text-[#666] hover:text-[#888] transition"
                        aria-label="플레이리스트 더보기"
                        title="더보기"
                    >
                    <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="mt-3 border-b border-[#E6E6E6]" />
                    
                    <div className="mt-2 overflow-x-auto overflow-y-hidden">
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
                                hover:bg-[#F5F5F5]
                                transition
                                p-2
                                text-left
                                "
                            >
                                {/* 커버 */}
                                <div className="w-full aspect-square rounded-xl bg-[#D9D9D9]" />

                                {/* 텍스트 */}
                                <div className="mt-3">
                                <div className="text-sm font-medium text-[#666666] truncate">
                                    곡 명
                                </div>
                                <div className="mt-1 text-xs text-[#9A9A9A] truncate">
                                    생성일
                                </div>
                                </div>
                            </button>
                            ))}
                        </div>
                        </div>
                    </div>
                </section>

                {/* 우측 */}
                <aside className="col-span-6 rounded-2xl border border-[#E6E6E6] bg-white p-6">
                <h2 className="px-1 text-xl font-semibold text-[#666666]">
                    실시간 나의 TOP 50 차트
                </h2>

                <div className="mt-4 border-b border-[#E6E6E6]" />

                {/* 헤더 */}
                <div className="mt-3 grid grid-cols-[100px_200px_1fr] items-center px-4 text-sm text-[#666]">
                    <div className="border-l pl-4">순위</div>
                    <div className="border-l border-[#E6E6E6] pl-4">곡정보</div>
                    <div className="border-l border-[#E6E6E6] pl-4">총 들은 수</div>
                </div>

                <div className="mt-3 border-b border-[#E6E6E6]" />

                {/* 바디 */}
                <div className="divide-y divide-[#E6E6E6]">
                    {top50Preview.map((r, idx) => (
                    <button
                        key={r.id}
                        type="button"
                        onClick={() => navigate(`/track/${r.id}`)}
                        className="w-full text-left transition hover:bg-gray-50"
                    >
                        <div
                        className={[
                            "grid grid-cols-[100px_200px_1fr] items-center px-4 py-3",
                            idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                        ].join(" ")}
                        >
                        {/* 순위 */}
                        <div className="pl-6 text-left font-semibold text-[#666]">
                            {r.rank}
                        </div>

                        {/* 곡정보 (커버 + 텍스트) */}
                        <div className="border-l border-[#E6E6E6] pl-4 min-w-0">
                            <div className="flex items-center gap-5 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#D9D9D9]" />
                            <div className="min-w-0">
                                <div className="truncate text-sm text-[#666666]">{r.title}</div>
                                <div className="truncate text-xs text-[#9A9A9A]">{r.artist}</div>
                            </div>
                            </div>
                        </div>

                        {/* 총 들은 수 */}
                        <div className="border-l border-[#E6E6E6] pl-4 text-left text-sm font-semibold text-[#666] whitespace-nowrap">
                            {r.total}번
                        </div>
                        </div>
                    </button>
                    ))}
                </div>
                </aside>


            </div>
            </div>
        </div>
        </div>
    );
}
