    import { useEffect, useMemo, useState } from "react";
    import { useNavigate } from "react-router-dom";
    import { FaPlus } from "react-icons/fa6";
    import {
    createPlaylist,
    getAllPlaylists,
    subscribePlaylists,
    } from "../../mocks/playlistMock";

    type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    };

    const LIKED_SYSTEM_ID = "liked";

    export default function MyPlaylistsPersonal() {
    const navigate = useNavigate();

    const [items, setItems] = useState<PlaylistItem[]>([]);

    useEffect(() => {
        const sync = () => {
        // ✅ liked 시스템 플리는 개인 목록에서 제외
        const list = getAllPlaylists()
            .filter((p) => p.id !== LIKED_SYSTEM_ID)
            .map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.owner,
            }));

        setItems(list);
        };

        sync();
        return subscribePlaylists(sync);
    }, []);

    const handleCreate = () => {
        const p = createPlaylist({
        title: "새 플레이리스트",
        owner: "사용자",
        isPublic: false,
        });

        // ✅ 생성 직후 상세로 이동 (원하면 주석 처리하면 목록에만 추가됨)
        navigate(`/playlist/${p.id}`);
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
        <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646]">
        {/* 헤더 */}
        <div className="px-8 pt-6 pb-2 flex items-center justify-between">
            <div className="text-lg font-semibold text-[#F6F6F6]">개인</div>

            <button
            type="button"
            onClick={handleCreate}
            className="w-9 h-9 rounded-full border border-[#464646] bg-[#3f3f3f] text-[#F6F6F6] grid place-items-center hover:bg-[#4a4a4a] transition"
            aria-label="새 플레이리스트"
            title="새 플레이리스트"
            >
            <FaPlus size={14} />
            </button>
        </div>

        {/* 헤더랑 같은 기준선 */}
        <div className="mb-4 mx-4 border-b border-[#464646]" />

        {/* 스크롤 없음: 늘어나면 섹션 자체가 커짐 */}
        <div className="px-6 pb-8 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                <div className="aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />

                <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                    {it.title}
                </div>
                <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {it.owner}
                </div>
                </button>
            ))}
            </div>
        </div>
        </section>
    );
    }
