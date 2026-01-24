import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { listLikedAlbums, type LikedAlbumSummary } from "../../api/album";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    liked?: boolean;
    kind?: "playlist" | "album" | "system";
    coverUrl?: string | null;
    coverUrls?: string[];
};

export default function MyPlaylistsLiked() {
    const navigate = useNavigate();
    const { likedPlaylists } = usePlaylists();

    // 좋아요한 앨범 목록
    const [likedAlbums, setLikedAlbums] = useState<LikedAlbumSummary[]>([]);

    // 좋아요한 앨범 가져오기
    useEffect(() => {
        const fetchAlbums = async () => {
        try {
            const albums = await listLikedAlbums();
            setLikedAlbums(albums);
        } catch (error) {
            console.error("좋아요한 앨범 로딩 실패:", error);
            setLikedAlbums([]);
        }
        };

        fetchAlbums();
    }, []);

    // Context에서 받은 좋아요 플레이리스트 + API 앨범 데이터
    const items = useMemo((): PlaylistItem[] => {
        // 1. 좋아요한 앨범 (실제 API에서)
        const likedAlbumItems: PlaylistItem[] = likedAlbums.map((album) => ({
        id: String(album.album_id),
        title: album.title,
        owner: album.artist_name,
        liked: true,
        kind: "album" as const,
        }));

        // 2. 좋아요한 다른 사람의 플레이리스트
        const playlistItems: PlaylistItem[] = likedPlaylists.map((p) => ({
        id: p.id,
        title: p.title,
        owner: p.creator_nickname,
        liked: true,
        kind: "playlist" as const,
        }));

        return [...likedAlbumItems, ...playlistItems];
    }, [likedAlbums, likedPlaylists]);

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
        <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10">
        <div className="px-8 pt-6 pb-2 flex items-center justify-between">
            <div className="text-xl font-semibold text-[#f6f6f6]">좋아요</div>

            <div className="w-10 h-10 text-[#f6f6f6]/80 grid place-items-center text-xl">
            ♥
            </div>
        </div>

        {/* ✅ 구분선: Section과 동일 */}
        <div className="mb-4 mx-4 border-b border-white/10" />

        {/* ✅ 본문 패딩: Section과 동일 */}
        <div className="px-6 pb-6 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={`${it.kind}:${it.id}`}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                {/* ✅ 카드: Section 카드 톤(rounded-2xl / bg-white/20 / hover)로 통일 */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/20 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
                    {it.coverUrl ? (
                    <img
                        src={it.coverUrl}
                        alt={it.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                    />
                    ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    )}

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {it.liked && (
                    <div
                        className={[
                        "absolute top-2 right-3 text-2xl",
                        it.kind === "system" ? "text-[#E4524D]/80" : "text-[#AFDEE2]/80",
                        ].join(" ")}
                    >
                        ♥
                    </div>
                    )}
                </div>

                {/* ✅ 텍스트: Section 카드 텍스트 톤으로 통일 */}
                <div className="mx-1 mt-3">
                    <div className="text-sm font-semibold text-[#f6f6f6]/95 truncate group-hover:text-[#AFDEE2] transition-colors">
                    {it.title}
                    </div>
                    <div className="mt-1 text-xs text-[#f6f6f6]/20">{it.owner}</div>
                </div>
                </button>
            ))}
            </div>
        </div>
        </section>
    );
}
