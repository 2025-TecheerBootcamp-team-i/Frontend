import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import React, { useRef, useMemo, useState, useEffect } from "react";
import { MdOutlineNavigateNext } from "react-icons/md";

import {
  listMyPlaylists,
  listLikedPlaylists,
  isSystemPlaylist,
  type PlaylistSummary,
} from "../../api/playlist";
import { fetchLikedTracks, type LikedTrack } from "../../api/LikedSong";
import { getCurrentUserId } from "../../utils/auth";
import axiosInstance from "../../api/axiosInstance";

const LIKED_SYSTEM_ID = "liked"; // 나중에 "liked -system으로 수정해야 함. 그렇지 않으면 개인 목록 맨 앞에 좋아요 누른 곡 리스트 생성됨

/* ===================== 타입 ===================== */
type PlaylistItem = {
  id: string;
  title: string;
  owner: string;
  scope: "personal" | "shared";
  liked?: boolean;
  kind?: "playlist" | "system" | "album";
  isPublic?: boolean; // 공개/비공개
  coverUrl?: string | null; // 단일 대표커버
  coverUrls?: string[]; // 2x2 모자이크용(좋아요 카드에서 사용)
};

type LikedAlbumApi = {
  album_id: number;
  album_name: string;
  artist_name: string;
  cover_image: string | null;
  release_date: string;
  like_count: string;
  is_liked: string;
};

// 좋아요 누른 곡 이미지 추가
function buildCoverUrlsFromLikedTracks(tracks: LikedTrack[], limit = 4): string[] {
  const urls = tracks
    .map((t) => t.album_image)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  // ✅ 같은 앨범 이미지 중복 제거
  return Array.from(new Set(urls)).slice(0, limit);
}

function toLikedAlbumItem(a: LikedAlbumApi): PlaylistItem {
  const id = String(a.album_id ?? "");
  const title = a.album_name ?? (id ? `앨범 (${id})` : "앨범");
  const owner = a.artist_name ?? "알 수 없음";
  const coverUrl = a.cover_image ?? null;

  return {
    id,
    title,
    owner,
    scope: "shared" as const,
    liked: true,
    kind: "album",
    coverUrl,
  };
}

/* ===================== UI 컴포넌트 ===================== */
function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "px-4 py-2 rounded-full text-lg transition whitespace-nowrap", // text-base -> text-lg
          isActive
            ? "bg-[#E4524D]/80 text-[#f6f6f6] font-semibold scale-105 z-10"
            : "bg-white/20 text-[#F6F6F6] hover:bg-white/[0.08] font-semibold hover:scale-105",
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
            h-10 w-10 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
          aria-label="왼쪽으로 이동"
        >
          <MdOutlineNavigateNext className="rotate-180" size={24} />
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
            h-10 w-10 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
          aria-label="오른쪽으로 이동"
        >
          <MdOutlineNavigateNext size={24} />
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
    <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10">
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="text-2xl font-bold text-[#f6f6f6]">{title}</div>
        {/* text-xl -> text-2xl */}

        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className="text-[#F6F6F6] hover:text-[#f6f6f6]/50 transition text-2xl leading-none"
            aria-label={`${title} 더보기`}
            title="더보기"
          >
            <MdOutlineNavigateNext size={34} />
          </button>
        )}
      </div>

      <div className="mb-4 mx-4 border-b border-white/10" />

      <div className="px-6 pb-6">
        <HorizontalScroller gradientFromClass="from-transparent">
          <div className="flex gap-5 min-w-max pr-2">
            {items.map((it) => (
              <button
                key={`${it.kind ?? "playlist"}:${it.id}`}
                type="button"
                onClick={() => onClickItem?.(it.id)}
                className="w-[220px] text-left group shrink-0"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/20 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
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
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div key={idx} className="w-full h-full bg-white/5" />
                        );
                      })}
                    </div>
                  ) : it.coverUrl ? (
                    <img
                      src={it.coverUrl}
                      alt={`${it.title} cover`}
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

                  {/* ❤️ 좋아요 하트 */}
                  {it.liked || it.kind === "system" ? (
                    <div
                      className={[
                        "absolute top-2 right-3 text-3xl", // text-2xl -> text-3xl
                        it.kind === "system" ? "text-[#E4524D]/80" : "text-[#AFDEE2]/80",
                      ].join(" ")}
                    >
                      ♥
                    </div>
                  ) : null}
                </div>

                <div className="mx-1 mt-3 text-base font-semibold text-[#f6f6f6]/95 truncate group-hover:text-[#AFDEE2] transition-colors">
                  {/* text-sm -> text-base */}
                  {it.title}
                </div>
                <div className="mx-1 mt-1 text-sm text-[#f6f6f6]/20">
                  {/* text-xs -> text-sm */}
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

  // 1) 개인 / 좋아요 플레이리스트 / 좋아요 앨범 (중요 API)
  const [myPlaylists, setMyPlaylists] = useState<PlaylistSummary[]>([]);
  const [likedPlaylists, setLikedPlaylists] = useState<PlaylistSummary[]>([]);
  const [likedAlbums, setLikedAlbums] = useState<LikedAlbumApi[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [mine, likedPl, likedAlRes] = await Promise.all([
          listMyPlaylists(), // GET /playlists?visibility=private
          listLikedPlaylists(), // GET /playlists/likes
          axiosInstance.get<LikedAlbumApi[]>("/albums/likes"),
        ]);

        if (cancelled) return;

        // 개인 목록에서 시스템 플레이리스트(“나의 좋아요 목록”)가 섞이면 제거
        const mineFiltered = Array.isArray(mine)
          ? mine.filter((p) => p.visibility !== "system" && !isSystemPlaylist(p.title))
          : [];

        const likedPlFiltered = Array.isArray(likedPl)
          ? likedPl.filter((p) => p.visibility !== "system" && !isSystemPlaylist(p.title))
          : [];

        setMyPlaylists(mineFiltered);
        setLikedPlaylists(likedPlFiltered);
        setLikedAlbums(Array.isArray(likedAlRes.data) ? likedAlRes.data : []);
      } catch (e) {
        console.error("[MyPlaylistPage] playlists/albums fetch 실패:", e);
        if (!cancelled) {
          setMyPlaylists([]);
          setLikedPlaylists([]);
          setLikedAlbums([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
  const likedCoverUrls = useMemo(() => buildCoverUrlsFromLikedTracks(likedTracks, 4), [likedTracks]);

  /* =====================
   파생 데이터는 useMemo로 계산
  ===================== */

  // 개인 목록(시스템 liked 제외)
  const personalAll: PlaylistItem[] = useMemo(() => {
    return myPlaylists.map((p) => ({
      id: String(p.playlist_id),
      title: p.title,
      owner: p.creator_nickname ?? "—",
      scope: "personal" as const,
      kind: "playlist",
      liked: p.is_liked,
      isPublic: p.visibility === "public",
    }));
  }, [myPlaylists]);

  // 좋아요 섹션(시스템 카드 + 좋아요 앨범 + 좋아요 플레이리스트)
  const likedAll: PlaylistItem[] = useMemo(() => {
    const likedAlbumItems: PlaylistItem[] = likedAlbums
      .map(toLikedAlbumItem)
      // id가 비어있으면 클릭 라우팅이 깨질 수 있어서 방어
      .filter((x) => x.id.length > 0);

    const likedPlaylistItems: PlaylistItem[] = (likedPlaylists ?? []).map((p) => ({
      id: String(p.playlist_id),
      title: p.title,
      owner: p.creator_nickname ?? "—",
      scope: "shared" as const,
      liked: true,
      kind: "playlist",
      isPublic: p.visibility === "public",
    }));

    return [
      // ✅ 좋아요 섹션 첫 카드(시스템: 좋아요 곡 모자이크)
      {
        id: LIKED_SYSTEM_ID,
        title: "나의 좋아요 목록",
        owner: "—",
        scope: "personal",
        kind: "system",
        coverUrls: likedCoverUrls,
      },
      ...likedAlbumItems,
      ...likedPlaylistItems,
    ];
  }, [likedAlbums, likedPlaylists, likedCoverUrls]);

  const personalTop = useMemo(() => personalAll.slice(0, 6), [personalAll]);
  const likedTop = useMemo(() => likedAll.slice(0, 6), [likedAll]);

  const handleClickPlaylist = (id: string) => {
    const it = likedAll.find((x) => x.id === id) || personalAll.find((x) => x.id === id);

    if (id === LIKED_SYSTEM_ID || it?.kind === "system") {
      navigate("/playlist/liked");
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
        <div className="mt-4 border-b border-white/10" />
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
