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
        <section className="w-full mt-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 px-8 py-10 min-h-[560px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <>
            {/* 플레이리스트 그리드 */}
            <div className="overflow-x-auto no-scrollbar">
            <div
                className="
                grid
                gap-x-10
                gap-y-12
                justify-between
                [grid-template-columns:repeat(4,220px)]
                px-4
                "
            >
                {playlists.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    className="
                    group
                    rounded-3xl
                    p-2
                    flex flex-col items-center text-left
                    transition-all duration-500
                    hover:-translate-y-2
                    "
                >
                    <div className="w-[208px]">
                    {/* 커버 */}
                    <div
                        className="
                        w-52 h-52
                        rounded-[32px]
                        bg-white/5
                        transition-all duration-700
                        border border-white/10
                        group-hover:border-white/30
                        group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(175,222,226,0.2)]
                        overflow-hidden
                        relative
                        backdrop-blur-xl
                        "
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-pulse" />
                        {p.image ? (
                        <img
                            src={p.image}
                            alt={p.title}
                            className="w-full h-full object-cover relative z-10 transition-transform duration-1000 group-hover:scale-110"
                        />
                        ) : (
                        <div className="w-full h-full bg-white/5" />
                        )}
                        
                        {/* 오버레이 효과 */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 duration-500">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 scale-75 group-hover:scale-100 transition-transform duration-700">
                                <FaPlay className="text-white ml-1" size={20} />
                            </div>
                        </div>
                    </div>

                    {/* 텍스트 */}
                    <div className="mt-5 w-full min-w-0 px-1">
                        <div className="text-base font-bold text-white truncate group-hover:text-[#AFDEE2] transition-colors tracking-tight">
                        {p.title}
                        </div>

                        <div className="mt-1 text-sm text-white/30 truncate font-medium">
                        {p.owner} · {p.track_count}곡
                        </div>
                    </div>
                    </div>
                </button>
                ))}
            </div>
            </div>
        </>
        </section>
    );
}
