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
            owner: p.creator_nickname,
        }));
    }, [myPlaylists]);

    const handleCreate = async () => {
        await createPlaylist();
    };

    // ✅ 스타일 string은 useMemo로 고정(선택)
    const gridClass = useMemo(
        () =>
        `
            grid
            gap-x-6
            gap-y-12
            justify-between
            [grid-template-columns:repeat(4,220px)]
        `,
        []
    );

    return (
        <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        {/* 헤더 */}
        <div className="px-10 pt-8 pb-4 flex items-center justify-between">
            <div className="text-xl font-black tracking-[0.2em] text-white uppercase opacity-80">개인 플레이리스트</div>

            <button
            type="button"
            onClick={handleCreate}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white/40 grid place-items-center hover:bg-white/10 hover:text-[#AFDEE2] transition-all"
            aria-label="새 플레이리스트"
            title="새 플레이리스트"
            >
            <FaPlus size={16} />
            </button>
        </div>

        {/* 헤더랑 같은 기준선 */}
        <div className="mx-10 border-b border-white/10 mb-10" />

        {/* 스크롤 없음: 늘어나면 섹션 자체가 커짐 */}
        <div className="px-10 pb-10 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                <div className="relative aspect-square rounded-[32px] bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-500 shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="mt-5 px-2">
                    <div className="text-[15px] font-bold text-white/95 truncate tracking-tight group-hover:text-[#AFDEE2] transition-colors">
                        {it.title}
                    </div>
                    <div className="mt-1.5 text-[11px] font-black text-white/20 uppercase tracking-widest">
                        {it.owner}
                    </div>
                </div>
                </button>
            ))}
            </div>
        </div>
        </section>
    );
    }
