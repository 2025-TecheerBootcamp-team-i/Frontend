import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
};

const LIKED_SYSTEM_ID = "liked"; // ✅ 항상 첫 카드

export default function MyPlaylistsLiked() {
    const navigate = useNavigate();

    const likedPlaylists = useMemo<PlaylistItem[]>(
        () => [
        { id: "p2", title: "플레이리스트명", owner: "제작자" },
        { id: "s1", title: "플레이리스트명", owner: "제작자" },
        { id: "s3", title: "플레이리스트명", owner: "제작자" },
        { id: "s5", title: "플레이리스트명", owner: "제작자" },
        { id: "s6", title: "플레이리스트명", owner: "제작자" },
        { id: "s7", title: "플레이리스트명", owner: "제작자" },
        { id: "s8", title: "플레이리스트명", owner: "제작자" },
        { id: "s9", title: "플레이리스트명", owner: "제작자" },
        // 더 늘어나면 자동으로 아래 행 추가
        ],
        []
    );

    const items: PlaylistItem[] = [
        { id: LIKED_SYSTEM_ID, title: "나의 좋아요 목록", owner: "—" },
        ...likedPlaylists,
    ];

    return (
        <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646]">
        {/* 헤더 */}
        <div className="px-8 pt-6 pb-2 flex items-center justify-between">
            <div className="text-lg font-semibold text-[#F6F6F6]">좋아요</div>
            <div className="w-9 h-9 rounded-full border border-[#464646] bg-[#3f3f3f] text-[#F6F6F6] grid place-items-center text-xl">♥</div>
        </div>

        <div className="mb-4 mx-4 border-b border-[#464646]" />

        <div className="px-6 pb-8 overflow-x-auto">
            <div
            className="
                grid
                gap-x-6
                gap-y-12
                justify-between
                [grid-template-columns:repeat(4,220px)]
            "
            >
            {items.map((it) => (
                <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                <div className="aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />
                <div className="px-1 flex justify-between mt-2">
                    <div className="pt-1 text-sm font-semibold text-[#F6F6F6] truncate">
                        {it.title}
                    </div>
                    <div
                        className={[
                            "text-xl",
                            it.id === LIKED_SYSTEM_ID
                                ? "text-[#E4524D]" : "text-[#AFDEE2]"
                            ].join(" ")}>♥</div>
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
