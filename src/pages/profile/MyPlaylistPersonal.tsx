import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { usePlaylists } from "../../contexts/PlaylistContext";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
};

export default function MyPlaylistsPersonal() {
    const navigate = useNavigate();
    const { myPlaylists, createPlaylist } = usePlaylists();

    // 개인 플레이리스트 표시 (시스템 플레이리스트 포함)
    const items = useMemo((): PlaylistItem[] => {
        return myPlaylists.map((p) => ({
        id: p.id,
        title: p.title,
        owner: p.creator_nickname ?? "—",
        }));
    }, [myPlaylists]);

    const handleCreate = async () => {
        await createPlaylist();
    };

    // ✅ 가로 5개(220px * 5) 고정 그리드
    const gridClass = useMemo(
        () =>
        `
            grid
            gap-x-5
            gap-y-12
            justify-between
            [grid-template-columns:repeat(5,220px)]
        `,
        []
    );

    return (
        <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10">
        <div className="px-8 pt-6 pb-2 flex items-center justify-between">
            <div className="text-2xl font-bold text-[#f6f6f6]">개인</div>

            <button
            type="button"
            onClick={handleCreate}
            className="
                w-10 h-10 rounded-full
                border border-white/10 bg-white/5
                text-white/40 grid place-items-center
                hover:bg-white/10 hover:text-[#AFDEE2]
                transition-all
            "
            aria-label="새 플레이리스트"
            title="새 플레이리스트"
            >
            <FaPlus size={18} />
            </button>
        </div>

        <div className="mb-4 mx-4 border-b border-white/10" />

        <div className="px-6 pb-6 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                {/* ✅ 카드 톤: MyPlaylistPage 카드와 동일 */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/20 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* ✅ 텍스트: MyPlaylistPage와 동일하게 한 단계 키움 */}
                <div className="mx-1 mt-3">
                    <div className="text-base font-semibold text-[#f6f6f6]/95 truncate group-hover:text-[#AFDEE2] transition-colors">
                    {it.title}
                    </div>
                    <div className="mt-1 text-sm text-[#f6f6f6]/20">{it.owner}</div>
                </div>
                </button>
            ))}
            </div>
        </div>
    </section>
  );
}
