    import { useEffect, useMemo, useState } from "react";
    import { useNavigate } from "react-router-dom";
    import {
    getAllPlaylists,
    subscribePlaylists,
    getLikedPlaylistIds,
    LIKED_SYSTEM_ID,
    } from "../../mocks/playlistMock";

    type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    liked?: boolean; // ✅ 추가
    };

    export default function MyPlaylistsLiked() {
    const navigate = useNavigate();
    const [items, setItems] = useState<PlaylistItem[]>([]);

    useEffect(() => {
        const sync = () => {
        const likedMap = getLikedPlaylistIds(); // { [playlistId]: true/false }
        const likedIds = Object.keys(likedMap).filter((id) => likedMap[id]);

        // ✅ 좋아요한 플레이리스트들 (시스템 liked 제외)
        const likedPlaylists = getAllPlaylists()
            .filter((p) => p.id !== LIKED_SYSTEM_ID)
            .filter((p) => likedIds.includes(p.id))
            .map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.owner,
            liked: true, // ✅ 좋아요 표시
            }));

        // ✅ 항상 첫 카드: "나의 좋아요 목록"(곡 좋아요 모음)
        const list: PlaylistItem[] = [
            { id: LIKED_SYSTEM_ID, title: "나의 좋아요 목록", owner: "—", liked: true }, // ✅ 시스템도 하트 표시
            ...likedPlaylists,
        ];

        setItems(list);
        };

        sync();
        return subscribePlaylists(sync);
    }, []);

    const gridClass = useMemo(
        () => `
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
            <div className="text-lg font-semibold text-[#F6F6F6]">좋아요</div>
            <div className="w-9 h-9 rounded-full border border-[#464646] bg-[#3f3f3f] text-[#F6F6F6] grid place-items-center text-xl">
            ♥
            </div>
        </div>

        <div className="mb-4 mx-4 border-b border-[#464646]" />

        <div className="px-6 pb-8 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                <div className="relative aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition">
                    {/* ❤️ 좋아요 하트 */}
                    {(it.id === LIKED_SYSTEM_ID || it.liked) && (
                    <div
                        className={[
                        "absolute top-2 right-3 text-xl drop-shadow",
                        it.id === LIKED_SYSTEM_ID ? "text-[#E4524D]" : "text-[#AFDEE2]",
                        ].join(" ")}
                    >
                        ♥
                    </div>
                    )}
                </div>

                <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                    {it.title}
                </div>

                <div className="px-1 mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {it.owner}
                </div>
                </button>
            ))}
            </div>
        </div>
        </section>
    );
    }
