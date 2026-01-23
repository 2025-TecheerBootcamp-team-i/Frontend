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
        <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        {/* 헤더 */}
        <div className="px-10 pt-8 pb-4 flex items-center justify-between">
            <div className="text-xl font-black tracking-[0.2em] text-white uppercase opacity-80">좋아요 목록</div>
            <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-[#AFDEE2] grid place-items-center text-xl shadow-inner">
            ♥
            </div>
        </div>

        <div className="mx-10 border-b border-white/10 mb-10" />
        <div className="px-10 pb-10 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={`${it.kind}:${it.id}`}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
                >
                <div className="relative aspect-square rounded-[32px] bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-500 shadow-xl overflow-hidden">
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
                      <div className={[
                          "absolute top-4 right-5 text-2xl drop-shadow-lg transition-transform duration-500 group-hover:scale-125",
                          it.kind === "system" ? "text-[#E4524D]" : "text-[#AFDEE2]"].join(" ")}
                      >♥
                      </div>
                    )}
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
