import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getAllPlaylists,
    subscribePlaylists,
    getLikedPlaylistIds,
    getLikedAlbumIds,
    LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";

import { ARTISTS } from "../../mocks/artistsMock";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    liked?: boolean;
    kind?: "playlist" | "album" | "system";
};

export default function MyPlaylistsLiked() {
    const navigate = useNavigate();
    const [items, setItems] = useState<PlaylistItem[]>([]);

    // ✅ albumKey(id 또는 title) -> { id, title, artist } 로 해석
    const resolveAlbumMeta = useMemo(() => {
        const byId = new Map<string, { title: string; artist: string }>();
        const byTitle = new Map<string, { id: string; title: string; artist: string }>();

        Object.values(ARTISTS).forEach((artist) => {
        artist.albums.forEach((alb) => {
            byId.set(alb.id, { title: alb.title, artist: artist.name });
            byTitle.set(alb.title, { id: alb.id, title: alb.title, artist: artist.name });
        });
        });

        return (key: string) => {
        // 1) key가 album.id인 경우
        const m1 = byId.get(key);
        if (m1) return { id: key, title: m1.title, artist: m1.artist };

        // 2) key가 album.title로 들어오는 경우
        const m2 = byTitle.get(key);
        if (m2) return { id: m2.id, title: m2.title, artist: m2.artist };

        // 3) 못 찾으면 fallback
        return { id: key, title: `앨범 (${key})`, artist: "알 수 없음" };
        };
    }, []);

    useEffect(() => {
        const sync = () => {
        /** =========================
         * 1. 좋아요한 앨범
         ========================= */
        const albumLikedMap = getLikedAlbumIds();
        const albumKeys = Object.keys(albumLikedMap).filter((k) => albumLikedMap[k]);

        const likedAlbums: PlaylistItem[] = albumKeys.map((key) => {
            const meta = resolveAlbumMeta(key);
            return {
            id: meta.id,         // ✅ 항상 진짜 album.id로 정규화(가능하면)
            title: meta.title,   // ✅ 앨범명
            owner: meta.artist,  // ✅ 아티스트명
            liked: true,
            kind: "album",
            };
        });

        /** =========================
         * 2. 좋아요한 플레이리스트
         ========================= */
        const likedPlMap = getLikedPlaylistIds();
        const likedPlIds = Object.keys(likedPlMap).filter((id) => likedPlMap[id]);

        const likedPlaylists: PlaylistItem[] = getAllPlaylists()
            .filter((p) => p.id !== LIKED_SYSTEM_ID)
            .filter((p) => likedPlIds.includes(p.id))
            .map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.owner,
            liked: true,
            kind: "playlist",
            }));

        /** =========================
         * 3. 최종 목록
         ========================= */
        const list: PlaylistItem[] = [
            {
            id: LIKED_SYSTEM_ID,
            title: "나의 좋아요 목록",
            owner: "—",
            liked: true,
            kind: "system",
            },
            ...likedAlbums,
            ...likedPlaylists,
        ];

        setItems(list);
        };

        sync();
        return subscribePlaylists(sync);
    }, [resolveAlbumMeta]);

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
                key={`${it.kind}:${it.id}`}
                type="button"
                onClick={() => {
                    if (it.kind === "album") navigate(`/album/${it.id}`);
                    else navigate(`/playlist/${it.id}`);
                }}
                className="w-[220px] text-left group"
                >
                <div className="relative aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition">
                    {it.liked && (
                    <div className={[
                        "absolute top-2 right-3 text-xl drop-shadow",
                        it.id === LIKED_SYSTEM_ID ? "text-[#E4524D]" : "text-[#AFDEE2]"].join(" ")}
                    >♥
                    </div>
                    )}
                </div>

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
