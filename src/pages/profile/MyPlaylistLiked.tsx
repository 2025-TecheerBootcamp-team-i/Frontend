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

const LIKED_SYSTEM_ID = "liked";

// 좋아요 곡 -> 앨범이미지 4장 만들기
function buildCoverUrlsFromLikedTracks(tracks: LikedTrack[], limit = 4): string[] {
  const urls = tracks
    .map((t) => t.album_image)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  return Array.from(new Set(urls)).slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickAlbumCover(album: LikedAlbumSummary): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (album as any).cover_image ?? null;
}

function pickPlaylistCover(p: LikedPlaylistSummary): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = p as any;
  return a.cover_image ?? a.cover_url ?? a.coverUrl ?? a.image ?? null;
}

function formatPlaylistOwner(p: LikedPlaylistSummary): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = p as any;
  const nick = a.creator_nickname ?? a.creatorNickname ?? a.owner_name ?? "—";
  const cnt =
    typeof a.item_count === "number"
      ? a.item_count
      : typeof a.itemCount === "number"
        ? a.itemCount
        : null;

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
    const list = await listLikedPlaylists();
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
   *  5) 화면 카드 모델(items)로 합치기
   * ========================= */
  const items = useMemo((): PlaylistItem[] => {
    const systemCount = likedTracks.length;
    const systemOwner =
      tracksLoading ? "불러오는 중..." : tracksError ? "불러오기 실패" : `총 ${systemCount}곡`;

    const systemCard: PlaylistItem = {
      id: LIKED_SYSTEM_ID,
      title: "나의 좋아요 목록",
      owner: systemOwner,
      liked: true,
      kind: "system",
      coverUrls: likedCoverUrls,
      coverUrl: likedCoverUrls[0] ?? null,
    };

    const playlistItems: PlaylistItem[] = likedPlaylistsApi.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const albumOwnerFallback = albumsLoading ? "불러오는 중..." : albumsError ? "불러오기 실패" : null;

    const albumItems: PlaylistItem[] = likedAlbums.map((album) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: String((album as any).album_id ?? (album as any).id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: String((album as any).title ?? (album as any).album_name ?? "앨범"),
      owner:
        albumOwnerFallback ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        String((album as any).artist_name ?? (album as any).artist ?? "—"),
      liked: true,
      kind: "album",
      coverUrl: pickAlbumCover(album),
    }));

    return [systemCard, ...playlistItems, ...albumItems];
  }, [likedTracks, likedCoverUrls, tracksLoading, tracksError, likedPlaylistsApi, likedAlbums, albumsLoading, albumsError]);

  // ✅ 5개 들어가게 변경 + 텍스트 한 단계씩 키움
  const gridClass = useMemo(
    () => `
      grid
      gap-x-5
      gap-y-12
      justify-between
      [grid-template-columns:repeat(5,220px)]
    `,
    []
  );

  /** =========================
   *  6) 클릭 시 라우팅 분기
   * ========================= */
  const handleOpen = useCallback(
    (it: PlaylistItem) => {
      if (it.kind === "system") {
        navigate(`/playlist/${LIKED_SYSTEM_ID}`);
        return;
      }
      if (it.kind === "album") {
        navigate(`/album/${it.id}`);
        return;
      }
      navigate(`/playlist/${it.id}`);
    },
    [navigate]
  );

  return (
    <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10">
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="text-2xl font-bold text-[#f6f6f6]">좋아요</div>

        <div className="w-10 h-10 text-[#f6f6f6]/80 grid place-items-center text-2xl">♥</div>
      </div>

      <div className="mb-4 mx-4 border-b border-white/10" />

      <div className="px-6 pb-6 overflow-x-auto">
        <div className={gridClass}>
          {items.map((it) => (
            <button
              key={`${it.kind}:${it.id}`}
              type="button"
              onClick={() => handleOpen(it)}
              className="w-[220px] text-left group"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/20 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
                {/* ✅ 4등분 우선 */}
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
                        <div
                          key={idx}
                          className="w-full h-full bg-gradient-to-br from-white/5 to-transparent"
                        />
                      );
                    })}
                  </div>
                ) : it.coverUrl ? (
                  <img
                    src={it.coverUrl}
                    alt={it.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* ✅ 하트 */}
                {it.liked && (
                  <div
                    className={[
                      "absolute top-2 right-3 text-3xl",
                      it.kind === "system" ? "text-[#E4524D]/80" : "text-[#AFDEE2]/80",
                    ].join(" ")}
                  >
                    ♥
                  </div>
                )}
              </div>

              {/* ✅ 텍스트 한 단계 키움 */}
              <div className="mx-1 mt-3">
                <div className="text-base font-semibold text-[#f6f6f6]/95 truncate group-hover:text-[#AFDEE2] transition-colors">
                  {it.title}
                </div>
                <div className="mt-1 text-sm text-[#f6f6f6]/20">{it.owner}</div>
              </div>
            </button>
          ))}
        </div>


        {likedPlaylistsLoading || albumsLoading || tracksLoading ? (
          <div className="mt-6 text-sm text-white/30">불러오는 중...</div>
        ) : null}
        {tracksError || albumsError || likedPlaylistsError ? (
          <div className="mt-2 text-sm text-red-200/70">
            {[tracksError, albumsError, likedPlaylistsError].filter(Boolean).join(" / ")}
          </div>
        ) : null}
      </div>
    </section>
  );
}
