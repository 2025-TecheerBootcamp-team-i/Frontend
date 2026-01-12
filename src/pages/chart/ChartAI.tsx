import { useMemo, useState } from "react";

import { FaPlay } from "react-icons/fa6";
import { IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";

import { AI } from "../../mocks/chart";

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
];

export default function ChartAI() {
    const GRID = "grid-cols-[44px_90px_1.2fr_1fr_200px]";

    // ✅ 같은 데이터 공유
    const rows = useMemo(() => AI, []);

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const allChecked = rows.length > 0 && rows.every((r) => checkedIds[r.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        rows.forEach((r) => (obj[r.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <section className="whitespace-nowrap rounded-2xl border border-[#E6E6E6] bg-white overflow-hidden">
        <div className="overflow-x-auto">
            <div className="min-w-[920px]">
            {/* 상단 헤더 */}
            <div className="px-8 py-6 border-b border-[#E6E6E6]">
                <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-semibold text-[#666666]">실시간 AI 음악 차트</h2>
                    <div className="text-sm text-[#999999]">26.01.07 14:00</div>
                </div>
                </div>

                {/* 액션 버튼 */}
                <div className="mt-4 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar">
                {actions.map((a) => (
                    <button
                    key={a.key}
                    type="button"
                    className="
                        shrink-0 px-4 py-2 
                        rounded-2xl 
                        outline outline-1 outline-offset-[-1px] outline-stone-500 
                        text-sm text-[#666666] hover:bg-[#f6f6f6]
                        transition
                        flex items-center gap-2
                    "
                    >
                    <span className="text-lg text-[#666666]">{a.icon}</span>
                    <span className="whitespace-nowrap">{a.label}</span>
                    </button>
                ))}
                </div>
            </div>

            {/* 테이블 헤더 */}
            <div>
                <div className={`grid ${GRID} items-center py-3 px-3 text-sm text-[#666666]`}>
                <div className="flex items-center justify-center">
                    <input
                    type="checkbox"
                    className="accent-gray-600"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="pl-2 border-l border-[#E6E6E6] whitespace-nowrap">순위</span>
                </div>

                <div className="pl-2 border-l border-[#E6E6E6]">곡정보</div>
                <div className="pl-2 border-l border-[#E6E6E6]">아티스트</div>
                <div className="pl-2 border-l border-[#E6E6E6]">앨범</div>
                </div>

                <div className="border-b border-[#E6E6E6]" />
            </div>

            {/* 리스트 */}
            <div>
                <div className="divide-y divide-[#F0F0F0]">
                {rows.map((row) => (
                    <div
                    key={row.id}
                    className={`group grid ${GRID} items-center px-3 py-3 hover:bg-[#FAFAFA] transition`}
                    >
                    <div className="flex items-center justify-center">
                        <input
                        type="checkbox"
                        className="accent-gray-600"
                        checked={!!checkedIds[row.id]}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`${row.rank}위 선택`}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-8 flex items-center justify-center">
                        <span className="text-sm text-[#333333] transition-opacity group-hover:opacity-0">
                            {row.rank}
                        </span>
                        <button className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#666666]">
                            <FaPlay />
                        </button>
                        </div>

                        <div className="pl-1 text-xs font-medium w-10">
                        {row.diff > 0 && <span className="text-red-500">▲ {row.diff}</span>}
                        {row.diff < 0 && (
                            <span className="text-blue-500">▼ {Math.abs(row.diff)}</span>
                        )}
                        {row.diff === 0 && <span className="pl-1 text-[#AAAAAA]">—</span>}
                        </div>
                    </div>

                    <div className="pl-2 flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#D9D9D9] shrink-0" />
                        <div className="min-w-0">
                        <div className="text-sm text-[#333333] truncate">{row.title}
                            {row.isAI && (
                                <span className="shrink-0 ml-3 text-xs px-2 py-[2px] rounded-full bg-[#ECECEC] text-[#666666]">
                                AI
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-[#999999] truncate md:hidden">{row.artist}</div>
                        </div>
                    </div>

                    <div className="pl-2 text-sm text-[#666666] truncate">{row.artist}</div>
                    <div className="pl-2 text-sm text-[#666666] truncate">{row.album}</div>
                    </div>
                ))}
                </div>
            </div>
            </div>
        </div>
        </section>
    );
}
