
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchLikedTracks, type LikedTrack } from "../../api/LikedSong";
import { getCurrentUserId } from "../../utils/auth";

const LIKED_SYSTEM_ID = "liked";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    liked?: boolean;
    kind?: "playlist" | "album" | "system";
    coverUrl?: string | null;
    coverUrls?: string[];
};

// MyPlaylistPage.tsx와 동일한 방식: 좋아요 곡 -> 앨범이미지 4장 만들기
function buildCoverUrlsFromLikedTracks(tracks: LikedTrack[], limit = 4): string[] {
  const urls = tracks
    .map((t) => t.album_image)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

    // 같은 앨범 이미지 중복 제거 후 최대 limit개
  return Array.from(new Set(urls)).slice(0, limit);
}

/** 좋아요 및 공개여부 앨범 API 응답 타입(백엔드 스펙에 맞춰 수정) */
type LikedAlbumApi = {
  album_id: string | number;
  album_name: string;
  artist_name: string;
  album_image?: string | null;
};

/** 좋아요 및 공개여부 플레이리스트 API 응답 타입(백엔드 스펙에 맞춰 수정 필요) */
type LikedPlaylistApi = {
  playlist_id: string | number;
  playlist_name: string;
  owner_name: string;
  cover_url?: string | null;
};

/** TODO: 실제 “좋아요 앨범 목록” API로 교체 */
async function fetchLikedAlbumsApi(_userId: string): Promise<LikedAlbumApi[]> {
  // 예시)
  // return await fetchLikedAlbums(userId);
  return [];
}

/** TODO: 실제 “좋아요 플레이리스트 목록” API로 교체 */
async function fetchLikedPlaylistsApi(_userId: string): Promise<LikedPlaylistApi[]> {
  // 예시)
  // return await fetchLikedPlaylists(userId);
  return [];
}

/** API 응답 -> 화면 카드 모델로 변환(어댑터) */
function mapLikedAlbumsToItems(albums: LikedAlbumApi[]): PlaylistItem[] {
  return albums.map((a) => ({
    id: String(a.album_id),
    title: a.album_name,
    owner: a.artist_name,
    liked: true,
    kind: "album",
    coverUrl: a.album_image ?? null,
  }));
}

function mapLikedPlaylistsToItems(playlists: LikedPlaylistApi[]): PlaylistItem[] {
  return playlists.map((p) => ({
    id: String(p.playlist_id),
    title: p.playlist_name,
    owner: p.owner_name,
    liked: true,
    kind: "playlist",
    coverUrl: p.cover_url ?? null,
  }));
}

export default function MyPlaylistsLiked() {
    const navigate = useNavigate();
    
    // 좋아요 누른 곡 플리
    const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 좋아요 누른 앨범 및 플리(실제 API 필요)
    const [collectionItems, setCollectionItems] = useState<PlaylistItem[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(false);
    const [collectionsError, setCollectionsError] = useState<string | null>(null);

     /** ✅ (추가) likedTracks -> 4등분용 coverUrls 생성 */
    const likedCoverUrls = useMemo(
      () => buildCoverUrlsFromLikedTracks(likedTracks, 4),
      [likedTracks]
    );

    const refresh = useCallback(async () => {
      setLoading(true);

      const userId = getCurrentUserId();
      if (!userId) {
        setLoading(false);
        setError("user_id를 찾을 수 없어요. 로그인 후 user_id 저장을 확인해주세요.");
        setLikedTracks([]);
        return;
      }

      try {
        setError(null);

        const list = await fetchLikedTracks(userId);
        setLikedTracks(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("[MyPlaylistsLiked] 좋아요 목록 불러오기 실패:", e);
      
        setError("좋아요 목록을 불러오지 못했어요.");
        setLikedTracks([]);
      } finally {
        setLoading(false);
      }
    }, []);

     /** ✅ (옵션) 좋아요 앨범/플리도 나중에 API 붙이면 여기만 채우면 됨 */
  const refreshCollections = useCallback(async () => {
    setCollectionsLoading(true);

    const userId = getCurrentUserId();
    if (!userId) {
      setCollectionsLoading(false);
      setCollectionsError("user_id를 찾을 수 없어요.");
      setCollectionItems([]);
      return;
    }

    try {
      setCollectionsError(null);

      const [albums, playlists] = await Promise.all([
        fetchLikedAlbumsApi(String(userId)),
        fetchLikedPlaylistsApi(String(userId)),
      ]);

      setCollectionItems([
        ...mapLikedAlbumsToItems(albums),
        ...mapLikedPlaylistsToItems(playlists),
      ]);
    } catch (e) {
      console.error("[MyPlaylistsLiked] 좋아요 목록(앨범/플리) 불러오기 실패:", e);
      setCollectionsError("좋아요 목록(앨범/플리)을 불러오지 못했어요.");
      setCollectionItems([]);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);


   // 페이지로 돌아왔을 때 최신화
  useEffect(() => {
    refresh();
    refreshCollections();

    const onFocus = () => {
      refresh();
      refreshCollections();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    }, [refresh, refreshCollections]);

  // 화면에 보여줄 카드 목록
  const items: PlaylistItem[] = useMemo(() => {
    const count = likedTracks.length;

    return [
      {
        id: LIKED_SYSTEM_ID,
        title: "나의 좋아요 목록",
        owner: loading ? "불러오는 중..." : error ? "불러오기 실패" : `총 ${count}곡`,
        liked: true,
        kind: "system",
        coverUrls: likedCoverUrls,
        coverUrl: likedCoverUrls[0] ?? null,
      },
    ];
  }, [likedTracks, likedCoverUrls, loading, error]);

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
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition">
                  {it.coverUrls?.length ? (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                      {Array.from({ length: 4 }).map((_, idx) => {
                        const src = it.coverUrls?.[idx];
                        return src ? (
                          <img
                            key={idx}
                            src={src}
                            alt={`${it.title} cover ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div key={idx} className="w-full h-full bg-[#3a3a3a]/40" />
                        );
                      })}
                    </div>
                ) : it.coverUrl ? (
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
                  <div className="absolute top-2 right-3 text-xl drop-shadow text-[#E4524D]">
                    ♥
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
