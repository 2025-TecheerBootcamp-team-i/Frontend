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
        <section className="w-full mt-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] px-6 py-8 min-h-[560px]">
        <>
            {/* 플레이리스트 그리드 */}
            <div className="overflow-x-auto">
            <div
                className="
                grid
                gap-x-6
                gap-y-12
                justify-between
                [grid-template-columns:repeat(4,220px)]
                "
            >
                {playlists.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    className="
                    group
                    rounded-2xl
                    p-2
                    flex flex-col items-center text-left
                    transition
                    "
                >
                    <div className="w-[208px]">
                    {/* 커버 */}
                    <div
                        className="
                        w-52 h-52
                        rounded-2xl
                        bg-[#777777]
                        transition
                        hover:shadow-[0_10px_28px_rgba(0,0,0,0.38)]
                        overflow-hidden
                        relative
                        "
                    >
                        {p.image ? (
                        <img
                            src={p.image}
                            alt={p.title}
                            className="w-full h-full object-cover"
                        />
                        ) : (
                        <div className="w-full h-full bg-[#777777]" />
                        )}
                    </div>

                    {/* 텍스트 */}
                    <div className="mt-4 w-full min-w-0">
                        <div className="text-base font-semibold text-[#f6f6f6] truncate group-hover:text-[#AFDEE2] transition">
                        {p.title}
                        </div>

                        <div className="mt-1 text-sm text-[#f6f6f6]/60 truncate">
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
