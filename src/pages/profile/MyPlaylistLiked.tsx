import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listLikedAlbums, type LikedAlbumSummary } from "../../api/album";
import {
  listLikedPlaylists,
  type PlaylistSummary as LikedPlaylistSummary,
} from "../../api/playlist";
import { fetchLikedTracks, type LikedTrack } from "../../api/LikedSong";

import { getCurrentUserId } from "../../utils/auth";

type PlaylistItem = {
  id: string;
  title: string;
  owner: string;
  liked?: boolean;
  kind?: "playlist" | "album" | "system";
  coverUrl?: string | null;
  coverUrls?: string[];
};

const LIKED_SYSTEM_ID = "liked"; // (기존 PlaylistPage에서 special-case로 쓰던 값이면 그대로 유지)

// 좋아요 곡 -> 앨범이미지 4장 만들기 (Merge 전 로직 복구)
function buildCoverUrlsFromLikedTracks(tracks: LikedTrack[], limit = 4): string[] {
  const urls = tracks
    .map((t) => t.album_image)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  // 같은 앨범 이미지 중복 제거 후 최대 limit개
  return Array.from(new Set(urls)).slice(0, limit);
}

// (백엔드 응답 필드명이 조금씩 다를 수 있어서 안전하게 커버를 뽑는 헬퍼)
// 필요하면 너희 API 스펙에 맞게 한 줄로 정리해도 됨.
function pickAlbumCover(album: LikedAlbumSummary): string | null {
  return (album as any).cover_image ?? null;
}

function pickPlaylistCover(p: LikedPlaylistSummary): string | null {
  const a = p as any;
  return a.cover_image ?? a.cover_url ?? a.coverUrl ?? a.image ?? null;
}

function formatPlaylistOwner(p: LikedPlaylistSummary): string {
  const a = p as any;
  const nick = a.creator_nickname ?? a.creatorNickname ?? a.owner_name ?? "";
  const cnt =
    typeof a.item_count === "number" ? a.item_count :
    typeof a.itemCount === "number" ? a.itemCount :
    null;

  return cnt != null ? `${nick} · ${cnt}곡` : String(nick);
}

export default function MyPlaylistsLiked() {
  const navigate = useNavigate();

  /** =========================
   *  1) 좋아요 곡(= 시스템 카드용)
   * ========================= */
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);

  const refreshLikedTracks = useCallback(async () => {
    setTracksLoading(true);

    const userId = getCurrentUserId();
    if (!userId) {
      setTracksLoading(false);
      setTracksError("user_id를 찾을 수 없어요. 로그인 후 user_id 저장을 확인해주세요.");
      setLikedTracks([]);
      return;
    }

    try {
      setTracksError(null);
      const list = await fetchLikedTracks(userId);
      setLikedTracks(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("[MyPlaylistsLiked] 좋아요 곡 목록 불러오기 실패:", e);
      setTracksError("좋아요 곡 목록을 불러오지 못했어요.");
      setLikedTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }, []);

  // 4분할 커버에 쓸 URL 4개 만들기
  const likedCoverUrls = useMemo(
    () => buildCoverUrlsFromLikedTracks(likedTracks, 4),
    [likedTracks]
  );

  /** =========================
   *  2) 좋아요 앨범(= API)
   * ========================= */
  const [likedAlbums, setLikedAlbums] = useState<LikedAlbumSummary[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [albumsError, setAlbumsError] = useState<string | null>(null);

  const refreshLikedAlbums = useCallback(async () => {
    setAlbumsLoading(true);
    try {
      setAlbumsError(null);
      const albums = await listLikedAlbums();
      setLikedAlbums(Array.isArray(albums) ? albums : []);
    } catch (error) {
      console.error("[MyPlaylistsLiked] 좋아요한 앨범 로딩 실패:", error);
      setAlbumsError("좋아요한 앨범을 불러오지 못했어요.");
      setLikedAlbums([]);
    } finally {
      setAlbumsLoading(false);
    }
  }, []);

  /** =========================
   *  3) 좋아요 플레이리스트(= API)
   * ========================= */
  const [likedPlaylistsApi, setLikedPlaylistsApi] = useState<LikedPlaylistSummary[]>([]);
  const [likedPlaylistsLoading, setLikedPlaylistsLoading] = useState(false);
  const [likedPlaylistsError, setLikedPlaylistsError] = useState<string | null>(null);

  const refreshLikedPlaylists = useCallback(async () => {
    setLikedPlaylistsLoading(true);
    try {
      setLikedPlaylistsError(null);
      const list = await listLikedPlaylists(); // GET /playlists/likes  → /api/v1/playlists/likes
      setLikedPlaylistsApi(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("[MyPlaylistsLiked] 좋아요 플레이리스트 로딩 실패:", e);
      setLikedPlaylistsError("좋아요한 플레이리스트를 불러오지 못했어요.");
      setLikedPlaylistsApi([]);
    } finally {
      setLikedPlaylistsLoading(false);
    }
  }, []);



  /** =========================
   *  4) 포커스/진입 시 최신화
   * ========================= */
  useEffect(() => {
    refreshLikedTracks();
    refreshLikedAlbums();
    refreshLikedPlaylists();

    const onFocus = () => {
      refreshLikedTracks();
      refreshLikedAlbums();
      refreshLikedPlaylists();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshLikedTracks, refreshLikedAlbums, refreshLikedPlaylists]);

  /** =========================
   *  4) 화면 카드 모델(items)로 합치기 (어댑터)
   * ========================= */
  const items = useMemo((): PlaylistItem[] => {
    // 0) 시스템 카드(나의 좋아요 목록) ✅ 기존 그대로
    const systemCount = likedTracks.length;
    const systemOwner = tracksLoading
      ? "불러오는 중..."
      : tracksError
      ? "불러오기 실패"
      : `총 ${systemCount}곡`;

    const systemCard: PlaylistItem = {
      id: LIKED_SYSTEM_ID,
      title: "나의 좋아요 목록",
      owner: systemOwner,
      liked: true,
      kind: "system",
      coverUrls: likedCoverUrls,
      coverUrl: likedCoverUrls[0] ?? null,
    };

    // 1) 좋아요 플레이리스트(API)
    const playlistItems: PlaylistItem[] = likedPlaylistsApi.map((p) => {
      const a = p as any;
      return {
        id: String(a.playlist_id ?? a.id),
        title: String(a.title ?? a.playlist_name ?? "플레이리스트"),
        owner: formatPlaylistOwner(p),
        liked: true,
        kind: "playlist",
        coverUrl: pickPlaylistCover(p),
      };
    });

    // 2) 좋아요 앨범(API)
  const albumOwnerFallback =
    albumsLoading ? "불러오는 중..." : albumsError ? "불러오기 실패" : null;

  const albumItems: PlaylistItem[] = likedAlbums.map((album) => ({
    id: String((album as any).album_id ?? (album as any).id),
    title: String((album as any).title ?? (album as any).album_name ?? "앨범"),
    owner:
      albumOwnerFallback ??
      String((album as any).artist_name ?? (album as any).artist ?? ""),
    liked: true,
    kind: "album",
    coverUrl: pickAlbumCover(album),
  }));

    return [systemCard, ...playlistItems, ...albumItems];
  }, [
    likedTracks,
    likedCoverUrls,
    tracksLoading,
    tracksError,
    likedPlaylistsApi,
    likedAlbums,
    albumsLoading,
    albumsError,
  ]);

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

  /** =========================
   *  5) 클릭 시 라우팅 분기
   * ========================= */
  const handleOpen = useCallback(
    (it: PlaylistItem) => {
      // ✅ 너희 라우터에 album 상세가 있으면 여기만 /album으로 바꿔주면 됨
      if (it.kind === "album") {
        navigate(`/album/${it.id}`);
        return;
      }
      // system/playlist는 기존처럼 /playlist
      navigate(`/playlist/${it.id}`);
    },
    [navigate]
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
                onClick={() => handleOpen(it)}
                className="w-[220px] text-left group"
                >
               <div className="relative aspect-square rounded-[32px] bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-500 shadow-xl overflow-hidden">
                    {/* ✅ 4등분 우선 (system 카드 등 coverUrls 있는 경우) */}
                    {it.coverUrls?.length ? (
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                        {Array.from({ length: 4 }).map((_, idx) => {
                            const src = it.coverUrls?.[idx];
                            return src ? (
                            <img
                                key={idx}
                                src={src}
                                alt={`${it.title} cover ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                            />
                            ) : (
                            <div key={idx} className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
                            );
                        })}
                        </div>
                    ) : it.coverUrl ? (
                        <img
                        src={it.coverUrl}
                        alt={it.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    )}

                    {/* ✅ Merge 후 디자인 오버레이 유지 */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* ✅ 하트 아이콘 (Merge 후 디자인 유지) */}
                    {it.liked && (
                        <div
                        className={[
                            "absolute top-4 right-5 text-2xl drop-shadow-lg transition-transform duration-500 group-hover:scale-125",
                            it.kind === "system" ? "text-[#E4524D]" : "text-[#AFDEE2]",
                        ].join(" ")}
                        >
                        ♥
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
