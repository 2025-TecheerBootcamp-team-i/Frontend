import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import React, { useRef, useMemo, useState, useEffect } from "react";
import { MdOutlineNavigateNext } from "react-icons/md";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { SYSTEM_LIKED_PLAYLIST_TITLE } from "../../api/playlist";

type PlaylistItem = {
    id: string;
    title: string;
    owner: string;
    scope: "personal" | "shared";
    liked?: boolean;
    kind?: "playlist" | "system";
};

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
            <div className="text-lg font-semibold text-[#F6F6F6]">
            {title}
            </div>

            {onMore && (
            <button
            type="button"
            onClick={onMore}
            className="text-[#F6F6F6] hover:text-[#888] transition text-xl leading-none"
            aria-label={`${title} 더보기`}
            title="더보기"
            >
            <MdOutlineNavigateNext size={30} />
            </button>
            )}
        </div>

        <div className="mb-4 mx-4 border-b border-[#464646]" />

        <div className="px-6 pb-6">
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
            <div className="flex gap-5 min-w-max pr-2">
                {items.map((it) => (
                <button
                    key={it.id}
                    type="button"
                    onClick={() => onClickItem?.(it.id)}
                    className="w-[220px] text-left group shrink-0"
                >
                    <div className="relative aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition">
                    {/* ❤️ 좋아요 하트 */}
                    {it.liked ? (
                    <div className={[
                        "absolute top-2 right-3 text-xl drop-shadow",
                        it.kind === "system" ? "text-[#E4524D]" : "text-[#AFDEE2]"].join(" ")}
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

export default function MyPlaylistPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isRoot = pathname === "/my-playlists";

    // Context에서 데이터 가져오기
    const { myPlaylists, likedPlaylists } = usePlaylists();

    // 내 플레이리스트를 PlaylistItem 형식으로 변환
    const personalAll = useMemo((): PlaylistItem[] => {
        return myPlaylists.map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.creator_nickname,
            scope: "personal" as const,
            kind: p.title === SYSTEM_LIKED_PLAYLIST_TITLE ? "system" : "playlist",
        }));
    }, [myPlaylists]);

    // 좋아요한 플레이리스트를 PlaylistItem 형식으로 변환
    const likedAll = useMemo((): PlaylistItem[] => {
        return likedPlaylists.map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.creator_nickname,
            scope: p.title === SYSTEM_LIKED_PLAYLIST_TITLE ? "personal" : "shared",
            liked: true,
            kind: p.title === SYSTEM_LIKED_PLAYLIST_TITLE ? "system" : "playlist",
        }));
    }, [likedPlaylists]);

    // 개인 플레이리스트 (시스템 플레이리스트 제외)
    const personalPlaylistsOnly = useMemo(() => {
        return personalAll.filter((p) => p.title !== SYSTEM_LIKED_PLAYLIST_TITLE);
    }, [personalAll]);

    const handleClickPlaylist = (id: string) => {
        navigate(`/playlist/${id}`);
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
                    onClickItem={handleClickPlaylist}
                />
                <Section
                    title="좋아요 목록"
                    items={likedAll}
                    onMore={() => navigate("/my-playlists/liked")}
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
