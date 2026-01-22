import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { getLikedAlbumIds } from "../../mocks/playlistMock";
import { ARTISTS } from "../../mocks/artistsMock";
import { SYSTEM_LIKED_PLAYLIST_TITLE } from "../../api/playlist";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    liked?: boolean;
    kind?: "playlist" | "album" | "system";
};

export default function MyPlaylistsLiked() {
    const navigate = useNavigate();
    const { myPlaylists, likedPlaylists } = usePlaylists();

    // 앨범 메타데이터 해석
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
            const m1 = byId.get(key);
            if (m1) return { id: key, title: m1.title, artist: m1.artist };

            const m2 = byTitle.get(key);
            if (m2) return { id: m2.id, title: m2.title, artist: m2.artist };

            return { id: key, title: `앨범 (${key})`, artist: "알 수 없음" };
        };
    }, []);

    // Context에서 받은 좋아요 플레이리스트 + 로컬 앨범 데이터 결합
    const items = useMemo((): PlaylistItem[] => {
        // 1. 시스템 플레이리스트 ("나의 좋아요 목록") - myPlaylists에서 가져오기
        const systemPlaylist = myPlaylists.find((p) => p.title === SYSTEM_LIKED_PLAYLIST_TITLE);
        const systemItems: PlaylistItem[] = systemPlaylist ? [{
            id: systemPlaylist.id,
            title: systemPlaylist.title,
            owner: systemPlaylist.creator_nickname,
            liked: true,
            kind: "system" as const,
        }] : [];

        // 2. 좋아요한 앨범 (로컬 mock에서)
        const albumLikedMap = getLikedAlbumIds();
        const albumKeys = Object.keys(albumLikedMap).filter((k) => albumLikedMap[k]);

        const likedAlbums: PlaylistItem[] = albumKeys.map((key) => {
            const meta = resolveAlbumMeta(key);
            return {
                id: meta.id,
                title: meta.title,
                owner: meta.artist,
                liked: true,
                kind: "album" as const,
            };
        });

        // 3. 좋아요한 다른 사람의 플레이리스트 (likedPlaylists에는 이미 시스템 제외됨)
        const playlistItems: PlaylistItem[] = likedPlaylists.map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.creator_nickname,
            liked: true,
            kind: "playlist" as const,
        }));

        // 4. 시스템 플레이리스트를 맨 앞에, 앨범, 그 다음 나머지 플레이리스트 순서
        return [...systemItems, ...likedAlbums, ...playlistItems];
    }, [myPlaylists, likedPlaylists, resolveAlbumMeta]);

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
                        it.kind === "system" ? "text-[#E4524D]" : "text-[#AFDEE2]"].join(" ")}
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
