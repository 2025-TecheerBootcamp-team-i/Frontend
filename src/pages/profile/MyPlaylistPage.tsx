import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import React, { useRef, useMemo, useState, useEffect } from "react";
import { MdOutlineNavigateNext } from "react-icons/md";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { listLikedAlbums, type LikedAlbumSummary } from "../../api/album";

/* ===================== 타입 ===================== */
type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    scope: "personal" | "shared";
    liked?: boolean;
    kind?: "playlist" | "system" | "album";
    isPublic?: boolean;        // 공개/비공개
    coverUrl?: string | null;  // 단일 대표커버
    coverUrls?: string[];      // 2x2 모자이크용(좋아요 카드에서 사용)
};

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
        <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="px-10 pt-8 pb-4 flex items-center justify-between">
            <div className="text-xl font-black tracking-[0.2em] text-white uppercase opacity-80">
            {title}
            </div>

            {onMore && (
            <button
            type="button"
            onClick={onMore}
            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
            aria-label={`${title} 더보기`}
            title="더보기"
            >
            <MdOutlineNavigateNext size={30} />
            </button>
            )}
        </div>

        <div className="mx-10 border-b border-white/10 mb-8" />

        <div className="px-10 pb-10">
            <HorizontalScroller gradientFromClass="from-transparent">
            <div className="flex gap-8 min-w-max pr-4">
                {items.map((it) => (
                <button
                    key={`${it.kind ?? "playlist"}:${it.id}`}
                    type="button"
                    onClick={() => onClickItem?.(it.id)}
                    className="w-[220px] text-left group shrink-0"
                >
                    <div className="relative aspect-square rounded-[32px] overflow-hidden bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
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
                    <div className={[
                        "absolute top-4 right-5 text-2xl drop-shadow-lg transition-transform duration-500 group-hover:scale-125",
                        it.kind === "system" ? "text-[#E4524D]" : "text-[#AFDEE2]"].join(" ")}
                    >♥
                    </div>
                    ) : null}
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

    // Context에서 데이터 가져오기
    const { myPlaylists, likedPlaylists } = usePlaylists();

    // 좋아요한 앨범 목록
    const [likedAlbums, setLikedAlbums] = useState<LikedAlbumSummary[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 좋아요한 앨범 가져오기
                const albums = await listLikedAlbums();
                setLikedAlbums(albums);
            } catch (error) {
                console.error("좋아요한 앨범 로딩 실패:", error);
                setLikedAlbums([]);
            }
        };

        fetchData();
    }, []);

    // 좋아요 목록: 좋아요한 앨범 + 다른 사람의 플레이리스트
    const likedAll = useMemo((): PlaylistItem[] => {
        // 1. 좋아요한 앨범 (실제 API에서)
        const likedAlbumItems: PlaylistItem[] = likedAlbums.map((album) => ({
            id: String(album.album_id),
            title: album.title,
            owner: album.artist_name,
            scope: "shared" as const,
            liked: true,
            kind: "album" as const,
        }));

        // 2. 좋아요한 다른 사람의 플레이리스트
        const likedPlaylistItems: PlaylistItem[] = likedPlaylists.map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.creator_nickname,
            scope: "shared" as const,
            liked: true,
            kind: "playlist" as const, 
        }));
        
        return [...likedAlbumItems, ...likedPlaylistItems];
    }, [likedAlbums, likedPlaylists]);

    // 개인 플레이리스트 (시스템 플레이리스트 포함, 맨 앞에 고정)
    const personalPlaylistsOnly = useMemo((): PlaylistItem[] => {
        return myPlaylists.map((p): PlaylistItem => {
            const kind: "system" | "playlist" = p.visibility === "system" ? "system" : "playlist";
            return {
                id: p.id,
                title: p.title,
                owner: p.creator_nickname,
                scope: "personal",
                kind: kind,
            };
        });
    }, [myPlaylists]);

    const handleClickPlaylist = (id: string, kind?: string) => {
        if (kind === "album") {
            navigate(`/album/${id}`);
        } else {
            navigate(`/playlist/${id}`);
        }
    };


    return (
        <div className="w-full min-w-0 h-full flex flex-col">
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
                    title="개인 플레이리스트"
                    items={personalPlaylistsOnly}
                    onMore={() => navigate("/my-playlists/personal")}
                    onClickItem={(id) => handleClickPlaylist(id)}
                />
                <Section
                    title="좋아요 목록"
                    items={likedAll}
                    onMore={() => navigate("/my-playlists/liked")}
                    onClickItem={(id) => {
                        const item = likedAll.find(i => i.id === id);
                        handleClickPlaylist(id, item?.kind);
                    }}
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
