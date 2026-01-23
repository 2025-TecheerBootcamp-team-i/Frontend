import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { MdOutlineNavigateNext } from "react-icons/md";
import {
  getAllPlaylists,
  subscribePlaylists,
  getLikedPlaylistIds,
  getLikedAlbumIds,
} from "../../mocks/playlistMock";
import { ARTISTS } from "../../mocks/artistsMock";

import { fetchLikedTracks, type LikedTrack } from "../../api/LikedSong";
import { getCurrentUserId } from "../../utils/auth";

const LIKED_SYSTEM_ID = "liked"; // 나중에 "liked -system으로 수정해야 함. 그렇지 않으면 개인 목록 맨 앞에 좋아요 누른 곡 리스트 생성됨"

/* ===================== 타입 ===================== */
type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    scope: "personal" | "shared";
    liked?: boolean;
    kind?: "playlist" | "album" | "system";

    // ✅ 확장 대비
    isPublic?: boolean;        // 공개/비공개
    coverUrl?: string | null;  // 단일 대표커버
    coverUrls?: string[];      // 2x2 모자이크용(좋아요 카드에서 사용)
    };

// 좋아요 누른 곡 이미지 추가
function buildCoverUrlsFromLikedTracks(tracks: LikedTrack[], limit = 4): string[] {
  const urls = tracks
    .map((t) => t.album_image)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  // ✅ 같은 앨범 이미지 중복 제거
  return Array.from(new Set(urls)).slice(0, limit);
}

/* ===================== UI 컴포넌트 ===================== */
function Tab({ to, label }: { to: string; label: string }) {
    return (
        <NavLink
        to={to}
        end
        className={({ isActive }) =>
            [
            "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
            isActive
                ? "bg-[#E4524D] text-[#F6F6F6]"
                : "bg-[#4d4d4d] text-[#F6F6F6] hover:bg-[#5d5d5d]",
            ].join(" ")
        }
        >
        {label}
        </NavLink>
    );
    }

    type HorizontalScrollerProps = {
    children: React.ReactNode;
    scrollStep?: number;
    gradientFromClass?: string;
    };

    function HorizontalScroller({
    children,
    scrollStep = 300,
    gradientFromClass = "from-[#2d2d2d]/80",
    }: HorizontalScrollerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const update = () => {
        const el = ref.current;
        if (!el) return;

        const can = el.scrollWidth > el.clientWidth + 1;
        setCanScroll(can);

        if (!can) {
        setShowLeft(false);
        setShowRight(false);
        return;
        }

        const left = el.scrollLeft;
        const max = el.scrollWidth - el.clientWidth;

        setShowLeft(left > 4);
        setShowRight(left < max - 4);
    };

    useEffect(() => {
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return (
        <div className="relative mt-2">
        <div ref={ref} onScroll={update} className="overflow-x-auto overflow-y-hidden no-scrollbar">
            {children}
        </div>

        {canScroll && showLeft && (
            <button
            type="button"
            onClick={() => {
                ref.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
                setTimeout(update, 250);
            }}
            className="
                absolute left-1 top-1/2 -translate-y-1/2 z-10
                h-9 w-9 rounded-full
                bg-[#1d1d1d]/50 text-[#f6f6f6]
                flex items-center justify-center
                hover:bg-[#1d1d1d]/70 transition
            "
            aria-label="왼쪽으로 이동"
            >
            <MdOutlineNavigateNext className="rotate-180" size={22} />
            </button>
        )}

        {canScroll && showRight && (
            <button
            type="button"
            onClick={() => {
                ref.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
                setTimeout(update, 250);
            }}
            className="
                absolute right-1 top-1/2 -translate-y-1/2 z-10
                h-9 w-9 rounded-full
                bg-[#1d1d1d]/50 text-[#f6f6f6]
                flex items-center justify-center
                hover:bg-[#1d1d1d]/70 transition
            "
            aria-label="오른쪽으로 이동"
            >
            <MdOutlineNavigateNext size={22} />
            </button>
        )}

        {canScroll && showRight && (
            <div
            className={[
                "pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l to-transparent",
                gradientFromClass,
            ].join(" ")}
            />
        )}
        {canScroll && showLeft && (
            <div
            className={[
                "pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r to-transparent",
                gradientFromClass,
            ].join(" ")}
            />
        )}
        </div>
    );
    }
/* ===================== UI 컴포넌트 ===================== */

    function Section({
    title,
    items,
    onMore,
    onClickItem,
    }: {
    title: string;
    items: PlaylistItem[];
    onMore?: () => void;
    onClickItem?: (id: string) => void;
    }) {
    return (
        <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646]">
        <div className="px-8 pt-6 pb-2 flex items-center justify-between">
            <button
            type="button"
            onClick={onMore}
            className="text-lg font-semibold hover:text-[#888] text-[#F6F6F6]"
            >
            {title}
            </button>

            <button
            type="button"
            onClick={onMore}
            className="text-[#F6F6F6] hover:text-[#888] transition text-xl leading-none"
            aria-label={`${title} 더보기`}
            title="더보기"
            >
            <MdOutlineNavigateNext size={30} />
            </button>
        </div>

        <div className="mb-4 mx-4 border-b border-[#464646]" />

        <div className="px-6 pb-6">
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
            <div className="flex gap-5 min-w-max pr-2">
                {items.map((it) => (
                <button
                    key={`${it.kind ?? "playlist"}:${it.id}`}
                    type="button"
                    onClick={() => onClickItem?.(it.id)}
                    className="w-[220px] text-left group shrink-0"
                >
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition">
                      {/* ✅ 커버(2x2 모자이크 우선) */}
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
                            alt={`${it.title} cover`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                            />
                        ) : null}
                    {/* ❤️ 좋아요 하트 */}
                    {it.id === LIKED_SYSTEM_ID || it.liked ? (
                    <div className={[
                        "absolute top-2 right-3 text-xl drop-shadow",
                        it.id === LIKED_SYSTEM_ID ? "text-[#E4524D]" : "text-[#AFDEE2]"].join(" ")}
                    >♥
                    </div>
                    ) : null}
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
            </HorizontalScroller>
        </div>
        </section>
    );
}

/* ===================== 페이지 화면 및 API ===================== */
export default function MyPlaylistPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isRoot = pathname === "/my-playlists";

  /* =====================
   좋아요 기능
  ===================== */

  // 1) mock 플레이리스트 원본만 state로 관리 (subscribe는 1번만)
  const [allPlaylists, setAllPlaylists] = useState(() => getAllPlaylists());

  useEffect(() => {
    const sync = () => setAllPlaylists(getAllPlaylists());
    sync();
    return subscribePlaylists(sync);
  }, []);

  // 2) 좋아요 누른 곡 리스트 (API)
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const user_id = getCurrentUserId();
        if (!user_id) return;

        const tracks = await fetchLikedTracks(user_id);
        setLikedTracks(Array.isArray(tracks) ? tracks : []);
      } catch (e) {
        console.error("[MyPlaylistPage] fetchLikedTracks 실패:", e);
      }
    })();
  }, []);

  // 3) 좋아요 곡들의 앨범이미지로 2x2 모자이크 커버 생성
  const likedCoverUrls = useMemo(
    () => buildCoverUrlsFromLikedTracks(likedTracks, 4),
    [likedTracks]
  );

  // 4) 앨범 메타 인덱스 (albumId -> {title, owner})
  const albumIndex = useMemo(() => {
    const map = new Map<string, { title: string; owner: string }>();
    Object.values(ARTISTS).forEach((artist) => {
      artist.albums.forEach((alb) => {
        map.set(alb.id, { title: alb.title, owner: artist.name });
      });
    });
    return map;
  }, []);

  /* =====================
   파생 데이터는 useMemo로 계산
  ===================== */

  // 개인 목록(시스템 liked 제외)
  const personalAll: PlaylistItem[] = useMemo(() => {
    return allPlaylists
      .filter((p) => p.id !== LIKED_SYSTEM_ID)
      .map((p) => ({
        id: p.id,
        title: p.title,
        owner: p.owner,
        scope: "personal" as const,
      }));
  }, [allPlaylists]);

  // 좋아요 섹션(시스템 카드 + 좋아요 앨범 + 좋아요 플레이리스트)
  const likedAll: PlaylistItem[] = useMemo(() => {
    const userPlaylists = allPlaylists.filter((p) => p.id !== LIKED_SYSTEM_ID);

    // 좋아요 앨범
    const albumLikedMap = getLikedAlbumIds();
    const albumIds = Object.keys(albumLikedMap).filter((id) => albumLikedMap[id]);

    const likedAlbums: PlaylistItem[] = albumIds.map((albumId) => {
      const meta = albumIndex.get(albumId);
      return {
        id: albumId,
        title: meta?.title ?? `앨범 (${albumId})`,
        owner: meta?.owner ?? "알 수 없음",
        scope: "shared" as const,
        liked: true,
        kind: "album",
      };
    });

    // 좋아요 플레이리스트
    const likedMap = getLikedPlaylistIds();
    const likedIdSet = new Set(Object.keys(likedMap).filter((id) => likedMap[id]));

    const likedPlaylists: PlaylistItem[] = userPlaylists
      .filter((p) => likedIdSet.has(p.id))
      .map((p) => ({
        id: p.id,
        title: p.title,
        owner: p.owner,
        scope: "personal" as const,
        liked: true,
      }));

    // 좋아요 섹션 첫 카드(시스템)
    return [
      {
        id: LIKED_SYSTEM_ID,
        title: "나의 좋아요 목록",
        owner: "—",
        scope: "personal",
        kind: "system",
        coverUrls: likedCoverUrls,
      },
      ...likedAlbums,
      ...likedPlaylists,
    ];
  }, [allPlaylists, albumIndex, likedCoverUrls]);

  const personalTop = useMemo(() => personalAll.slice(0, 6), [personalAll]);
  const likedTop = useMemo(() => likedAll.slice(0, 6), [likedAll]);

  const handleClickPlaylist = (id: string) => {
    const it = likedAll.find((x) => x.id === id) || personalAll.find((x) => x.id === id);

    if (id === LIKED_SYSTEM_ID || it?.kind === "system") {
      navigate("/my-playlists/liked");
      return;
    }
    if (it?.kind === "album") {
      navigate(`/album/${id}`);
      return;
    }
    navigate(`/playlist/${id}`);
  };

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      {/* ... (이하 UI 렌더는 기존 그대로) */}
      <div className="sticky top-0 z-20 pt-2">
        <div className="mt-2 px-4 flex gap-3 items-center">
          <Tab to="" label="모두" />
          <Tab to="personal" label="개인" />
          <Tab to="liked" label="♥" />
        </div>
        <div className="mt-4 border-b border-[#464646]" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <div className="px-0">
          {isRoot ? (
            <div className="space-y-6">
              <Section
                title="개인"
                items={personalTop}
                onMore={() => navigate("personal")}
                onClickItem={handleClickPlaylist}
              />
              <Section
                title="좋아요"
                items={likedTop}
                onMore={() => navigate("liked")}
                onClickItem={handleClickPlaylist}
              />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}
