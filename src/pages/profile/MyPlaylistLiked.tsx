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
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                <div className="relative aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition">
                    {it.coverUrl ? (
                        <img
                        src={it.coverUrl}
                        alt={it.title}
                        className="absolute inset-0 w-full h-full rounded-2xl object-cover opacity-90"
                        loading="lazy"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-[#6b6b6b]/20" />
                    )}

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
