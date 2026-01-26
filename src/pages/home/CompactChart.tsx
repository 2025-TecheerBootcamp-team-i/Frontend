import { useMemo } from "react";
import { FaPlay } from "react-icons/fa6";
import { usePlayer } from "../../player/PlayerContext";
import type { ChartRow as ApiChartRow } from "../../api/chart";
import type { PlayerTrack } from "../../player/PlayerContext";
import { MdOutlineNavigateNext } from "react-icons/md";

interface CompactChartProps {
    items: ApiChartRow[];
    loading: boolean;
    onMoreClick?: () => void;
    activeTab: "TOP100" | "DAILY" | "AI";
    onTabChange: (tab: "TOP100" | "DAILY" | "AI") => void;
}

const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
};

export default function CompactChart({ items, loading, onMoreClick, activeTab, onTabChange }: CompactChartProps) {
    const { setTrackAndPlay } = usePlayer();

    // 중복 제거 후 상위 5개만 표시
    const displayItems = useMemo(() => {
        const seen = new Set<string>();
        const unique = items.filter((item) => {
            if (seen.has(item.musicId)) return false;
            seen.add(item.musicId);
            return true;
        });
        return unique.slice(0, 5);
    }, [items]);

    const tabs = [
        { id: "TOP100", label: "TOP 100" },
        { id: "DAILY", label: "일일차트" },
        { id: "AI", label: "AI 음악" },
    ] as const;

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
        <div className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] p-6 flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMoreClick}
                        className="mt-2 text-4xl px-2 font-bold text-[#f6f6f6] hover:text-[#f6f6f6]/50 transition-colors">실시간 차트
                    </button>
                    <div className="flex gap-3 items-center mt-2.5">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`h-9 px-4 py-1 rounded-full text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-[#E4524D]/80 text-[#f6f6f6] font-semibold scale-105 z-10"
                                    : "bg-white/20 text-[#F6F6F6] hover:bg-white/[0.08] font-semibold hover:scale-105"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={onMoreClick}
                    className="text-xs font-bold text-[#f6f6f6] hover:text-[#f6f6f6]/50 transition-colors"
                >
                    <MdOutlineNavigateNext size={30} />
                </button>
            </div>

            <div className="flex-1 flex flex-col divide-y divide-white/5 overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm">차트 로딩중...</div>
                ) : (
                    displayItems.map((item) => (
                        <div
                            key={item.musicId}
                            className="group flex-1 grid grid-cols-[48px_48px_72px_1fr_auto_48px] items-center gap-4 px-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                            {/* Rank with hover play button */}
                            <div className="relative flex items-center justify-center">
                                <span className="text-xl font-bold text-white/80 transition-opacity group-hover:opacity-0">
                                    {item.rank}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTrackAndPlay(toTrack(item));
                                    }}
                                    className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#AFDEE2] text-2xl"
                                    aria-label="재생"
                                >
                                    <FaPlay />
                                </button>
                            </div>

                            {/* Rank Change */}
                            <div className="text-center mr-3 text-sm font-bold">
                                {(() => {
                                    const change = item.rankChange;
                                    if (change === null || change === undefined || change === 0) return <span className="text-[#AAAAAA]">—</span>;
                                    if (change > 0) return <span className="text-red-500">▲{change}</span>;
                                    if (change < 0) return <span className="text-blue-500">▼{Math.abs(change)}</span>;
                                    return <span className="text-[#AAAAAA]">—</span>;
                                })()}
                            </div>

                            {/* Cover */}
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0 shadow-lg">
                                {item.albumImage && (
                                    <img src={item.albumImage} alt={item.musicName} className="w-full h-full object-cover" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="text-base font-bold text-white truncate">{item.musicName}</div>
                                    {item.isAi && (
                                        <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-[#E4524D]/20 text-[#E4524D] font-bold">AI</span>
                                    )}
                                </div>
                                <div className="text-sm text-white/40 truncate mt-1">{item.artistName} · {item.albumName}</div>
                            </div>

                            {/* Spacer for alignment */}
                            <div />

                            {/* Duration */}
                            <div className="text-sm text-white/50 whitespace-nowrap justify-self-end text-right">
                                {formatDuration(item.durationSec)}
                            </div>
                        </div>
                    ))
                )}
                <div
                    className="py-2 flex items-center justify-center "
                >
                    <button
                        type="button"
                        onClick={onMoreClick}
                        className="text-sm text-[#f6f6f6]/50 transition hover:text-[#f6f6f6]/80">더보기
                    </button>
                </div>
            </div>
        </div>
    );
}
