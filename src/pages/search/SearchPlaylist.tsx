import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

type Playlist = {
    id: string;
    title: string;
    owner?: string;
    image?: string | null;
    track_count?: number;
};

// ✅ 더미 플레이리스트
const ALL_PLAYLISTS: Playlist[] = Array.from({ length: 16 }).map((_, i) => ({
    id: String(i + 1),
    title: i % 2 === 0 ? `#christmas vibes ${i + 1}` : `플레이리스트 ${i + 1}`,
    owner: `user_${(i % 5) + 1}`,
    image: null,
    track_count: (i + 1) * 2,
}));

export default function SearchPlaylist() {
    const navigate = useNavigate();
    const [sp] = useSearchParams();
    const q = (sp.get("q") ?? "").trim();

    const playlists = useMemo(() => {
        if (!q) return ALL_PLAYLISTS;
        const lower = q.toLowerCase();
        return ALL_PLAYLISTS.filter(
        (p) =>
            p.title.toLowerCase().includes(lower) ||
            (p.owner ?? "").toLowerCase().includes(lower)
        );
    }, [q]);

    return (
        <section className="w-full mt-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 px-6 py-8 min-h-[560px]">
            <div className="overflow-x-auto no-scrollbar">
                <div
                className="
                    grid
                    gap-x-10
                    gap-y-14
                    justify-between
                    [grid-template-columns:repeat(5,220px)]
                    px-4
                "
                >
                {playlists.map((p) => (
                    <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    className="w-[220px] text-left group shrink-0"
                    >
                    {/* 커버: 살짝 키움 (w-50/h-50 → w-52/h-52) */}
                    <div
                        className="
                        w-52 h-52 rounded-2xl
                        bg-white/10 overflow-hidden relative
                        transition-all duration-700 ease-out
                        group-hover:shadow-[0_16px_28px_rgba(0,0,0,0.55)]
                        "
                    >
                        {p.image ? (
                        <img
                            src={p.image}
                            alt={p.title}
                            className="
                            w-full h-full object-cover
                            transition-all duration-1000
                            opacity-90 brightness-95
                            group-hover:scale-[1.15]
                            group-hover:opacity-100
                            group-hover:brightness-110
                            "
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                        ) : (
                        <div className="w-full h-full bg-white/10" />
                        )}
                    </div>
        
                    {/* 텍스트: 한 단계 업 */}
                    <div className="mt-4 ml-1 text-lg font-semibold text-[#F6F6F6] truncate group-hover:text-[#AFDEE2] transition-colors">
                        {p.title}
                    </div>
        
                    <div className="mt-1 ml-1 text-sm text-[#F6F6F6]/60 truncate">
                        {(p.owner ?? "unknown") +
                        (p.track_count != null ? ` · ${p.track_count}곡` : "")}
                    </div>
                    </button>
                ))}
                </div>
            </div>
        </section>
    );
}
