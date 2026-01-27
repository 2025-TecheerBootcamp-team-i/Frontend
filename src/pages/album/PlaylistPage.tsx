// PlaylistDetailPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPlaylistDetail,
    likePlaylist,
    unlikePlaylist,
    deletePlaylistItem,
    type PlaylistDetail,
    type PlaylistItem,
} from "../../api/playlist";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";
import { getCurrentUserId } from "../../utils/auth";
import { isSystemPlaylist } from "../../api/playlist";
import { playTrack } from "../../api/music";

import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdDelete, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import { FiEdit3 } from "react-icons/fi";

import { fetchLikedTracks, type LikedTrack } from "../../api/LikedSong";
import { createPortal } from "react-dom";

/* =====================
  Const / Utils
===================== */

// 라우팅 분기점
const LIKED_SYSTEM_ID = "liked";

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "delete", label: "지우기", icon: <MdDelete size={18} /> },
] as const;

const toSeconds = (duration?: number) => duration ?? 0;

const formatTotal = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
};

type PendingPlay = {
    key: "play" | "shuffle";
    tracks: PlayerTrack[];
};

// ✅ ArtistPage 헤더 스타일과 동일하게 쓰려고 추가: 이미지 URL 정규화
function resolveImgUrl(API_BASE: string | undefined, src?: string | null) {
    if (!src) return null;
    if (src.startsWith("http") || src.startsWith("//")) return src;
    if (API_BASE && src.startsWith("/")) {
        return `${API_BASE.replace("/api/v1", "")}${src}`;
    }
    return src;
}

function buildLikedSystemPlaylist(userId: number, likedTracks: LikedTrack[]): PlaylistDetail {
    const nowIso = new Date().toISOString();

    const items: PlaylistItem[] = likedTracks.map((t, idx) => ({
        item_id: t.music_id,
        order: idx + 1,
        created_at: nowIso,
        music: {
            music_id: t.music_id,
            title: t.music_name,
            duration: t.duration ?? 0,
            artist: { name: t.artist_name },
            album: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                title: (t as any).album_name ?? "",
                cover_image: t.album_image ?? null,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
    }));

    return {
        playlist_id: 0,
        title: "나의 좋아요 목록",
        creator_nickname: "내 컬렉션",
        visibility: "private",
        user_id: userId,
        is_liked: true,
        like_count: 0,
        items,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

/* =====================
  Modal (Portal) - ArtistTracksPage와 동일 패턴
===================== */

function ModalPortal({ children }: { children: React.ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

function useLockBodyScroll(open: boolean) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);
}

function useEscToClose(open: boolean, onClose: () => void) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);
}

function BaseModal({
    open,
    title,
    onClose,
    maxWidthClass = "max-w-[440px]",
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    maxWidthClass?: string;
    children: React.ReactNode;
}) {
    useEscToClose(open, onClose);
    useLockBodyScroll(open);

    if (!open) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[99999] whitespace-normal">
                <button
                    type="button"
                    className="absolute inset-0 bg-black/50"
                    onClick={onClose}
                    aria-label="닫기"
                />
                <div className="absolute inset-0 grid place-items-center p-6">
                    <div
                        className={`w-full ${maxWidthClass} rounded-3xl bg-[#3d3d3d] border border-white/10 shadow-2xl overflow-hidden`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                    >
                        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
                            <div className="text-lg font-semibold text-[#F6F6F6]">{title}</div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-[#F6F6F6]/70 hover:text-white transition"
                                aria-label="닫기"
                            >
                                ✕
                            </button>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

/* =====================
Component
===================== */

export default function PlaylistDetailPage() {
    const { playlistId } = useParams();
    const isLikedSystem = playlistId === LIKED_SYSTEM_ID;
    const { playTracks, enqueueTracks, playListAtIndex } = usePlayer();
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

    const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentUserId = getCurrentUserId();

    const [localLiked, setLocalLiked] = useState(false);
    const [localLikeCount, setLocalLikeCount] = useState(0);
    const [checkedIds, setCheckedIds] = useState<Record<number, boolean>>({});

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    useEffect(() => {
        setCheckedIds({});
    }, [playlistId]);

    const fetchPlaylistDetail = useCallback(async () => {
        if (!playlistId) return;

        try {
            setLoading(true);
            setError(null);

            if (isLikedSystem) {
                if (!requireLogin("로그인 후 이용 가능합니다.")) {
                    setPlaylist(null);
                    setError("로그인 후 이용 가능합니다.");
                    return;
                }

                const userId = getCurrentUserId();
                if (!userId) {
                    setPlaylist(null);
                    setError("user_id를 찾을 수 없어요. 로그인 후 user_id 저장을 확인해주세요.");
                    return;
                }

                const likedTracks = await fetchLikedTracks(userId);
                const virtualPlaylist = buildLikedSystemPlaylist(userId, likedTracks);
                setPlaylist(virtualPlaylist);
                return;
            }

            const data = await getPlaylistDetail(playlistId);
            setPlaylist(data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("[PlaylistPage] 플레이리스트 로딩 실패:", err);
            const errorMessage =
                err?.response?.status === 404 ? "플레이리스트를 찾을 수 없습니다" : "플레이리스트를 불러올 수 없습니다";
            setPlaylist(null);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [playlistId, isLikedSystem]);

    useEffect(() => {
        fetchPlaylistDetail();
    }, [fetchPlaylistDetail]);

    useEffect(() => {
        if (playlist) {
            setLocalLiked(playlist.is_liked);
            setLocalLikeCount(playlist.like_count);
        }
    }, [playlist]);

    const runPendingPlay = (mode: "replace" | "enqueue") => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (!pendingPlay) return;

        const isShuffle = pendingPlay.key === "shuffle";

        if (mode === "replace") playTracks(pendingPlay.tracks, { shuffle: isShuffle });
        else enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });

        setCheckedIds({});
        setPendingPlay(null);
        setPlayConfirmOpen(false);
    };

    const getAlbumInfo = (item: PlaylistItem) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m: any = item?.music;
        return {
            title: m?.album?.title ?? m?.album_title ?? m?.album_name ?? "",
            cover_image: m?.album?.cover_image ?? m?.album_image ?? m?.cover_image ?? null,
        };
    };

    const getArtistName = (item: PlaylistItem) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m: any = item?.music;
        return m?.artist?.name ?? m?.artist_name ?? "";
    };

    const tracks = playlist?.items ?? [];

    const coverUrls = useMemo(() => {
        return tracks
            .map((t) => getAlbumInfo(t).cover_image)
            .filter((v): v is string => typeof v === "string" && v.length > 0)
            .slice(0, 4);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracks]);

    const headerImageUrl = resolveImgUrl(API_BASE, coverUrls[0] ?? null);

    const toPlayerTrack = (t: PlaylistItem): PlayerTrack => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m: any = t?.music ?? {};
        const album = getAlbumInfo(t);
        const artist = getArtistName(t);

        return {
            id: String(t.item_id),
            musicId: m?.music_id ?? t.item_id,
            title: m?.title ?? m?.music_name ?? "(제목 없음)",
            artist: artist || "(아티스트 없음)",
            coverUrl: album.cover_image ?? undefined,
            audioUrl: "/audio/sample.mp3",
            duration: m?.duration
                ? `${Math.floor(m.duration / 60)}:${String(m.duration % 60).padStart(2, "0")}`
                : "0:00",
        };
    };

    const checkedTracks = tracks.filter((t) => !!checkedIds[t.item_id]).map(toPlayerTrack);
    const selectedCount = checkedTracks.length;

    const deleteSelected = async () => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (!playlist) return;
        if (selectedCount === 0) return;

        // ✅ confirm은 그대로(브라우저 기본) 두되, 원하면 이것도 BaseModal로 바꿔줄게
        const ok = confirm(`${selectedCount}곡을 이 플레이리스트에서 삭제할까요?`);
        if (!ok) return;

        try {
            const itemIds = tracks.filter((t) => !!checkedIds[t.item_id]).map((t) => t.item_id);

            const results = await Promise.allSettled(itemIds.map((id) => deletePlaylistItem(id)));
            const failed = results.filter((r) => r.status === "rejected");
            if (failed.length > 0) console.error("[PlaylistPage] 일부 곡 삭제 실패:", failed);

            setCheckedIds({});
            await fetchPlaylistDetail();
        } catch (e) {
            console.error("곡 삭제 실패:", e);
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds((t as any)?.music?.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    if (loading) {
        return (
            <div className="w-full min-w-0 px-6 py-5 text-white">
                <div className="p-4 text-[#F6F6F6]/70">로딩중...</div>
            </div>
        );
    }

    if (error || !playlist) {
        return (
            <div className="w-full min-w-0 px-6 py-5 text-white">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-6 text-[#aaa] hover:text-white transition"
                    aria-label="뒤로가기"
                >
                    <IoChevronBack size={24} />
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="text-xl font-semibold">플레이리스트를 찾을 수 없어요.</div>
                    <div className="mt-2 text-sm text-[#aaa]">{error || `요청한 ID: ${playlistId ?? "(없음)"}`}</div>
                </div>
            </div>
        );
    }

    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.item_id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<number, boolean> = {};
        tracks.forEach((t) => (obj[t.item_id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: number) => setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));

    const isSystemPl = isLikedSystem || isSystemPlaylist(playlist.title);
    const canEdit = currentUserId !== null && playlist.user_id === currentUserId && !isSystemPl;

    const toggleLike = async () => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

        const wasLiked = localLiked;
        setLocalLiked(!wasLiked);
        setLocalLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

        try {
            if (wasLiked) await unlikePlaylist(playlist.playlist_id);
            else await likePlaylist(playlist.playlist_id);
            await fetchPlaylistDetail();
        } catch (e) {
            console.error("좋아요 토글 실패:", e);
            setLocalLiked(wasLiked);
            setLocalLikeCount(playlist.like_count);
        }
    };

    return (
        <div className="w-full min-w-0 overflow-x-auto">
            {/* 상단 */}
            <section className="relative overflow-visible">
                <div className="relative h-72 bg-[#4d4d4d]/50 border-b border-[#3D3D3D] overflow-hidden">
                    {headerImageUrl && (
                        <img
                            src={headerImageUrl}
                            alt=""
                            aria-hidden="true"
                            className="
                    absolute inset-0 z-0
                    w-full h-full object-cover
                    scale-125 blur-3xl opacity-80
                    saturate-125 brightness-125 contrast-80
                "
                            loading="eager"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    )}

                    <div
                        className="
                pointer-events-none absolute inset-0 z-[1]
                opacity-40
                mix-blend-soft-light
                bg-[linear-gradient(120deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06),rgba(0,0,0,0.10),rgba(255,255,255,0.18))]
                bg-[length:260%_260%]
                animate-bgShift
                "
                    />
                    <div
                        className="
                pointer-events-none absolute inset-0 z-[2]
                opacity-50
                blur-xl
                bg-[linear-gradient(to_bottom,rgba(29,29,29,0.05)_0%,rgba(29,29,29,0.45)_70%,rgba(29,29,29,0.75)_100%)]
                bg-[length:240%_240%]
                animate-bgShift2
                "
                    />

                    <div
                        className="
                absolute inset-0
                bg-gradient-to-b
                from-[#1D1D1D]/10 via-[#1D1D1D]/65 to-[#1D1D1D]
                "
                    />

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="absolute left-4 top-5 z-10 p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                        aria-label="뒤로가기"
                        title="뒤로가기"
                    >
                        <IoChevronBack size={24} />
                    </button>

                    {isSystemPl && (
                        <div
                            className="absolute right-4 top-5 z-10 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
                            title="나의 좋아요 목록"
                        >
                            <MdFavorite size={24} className="text-[#E4524D]" />
                        </div>
                    )}

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => {
                                if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                                navigate(`/playlist/${playlist.playlist_id}/edit`);
                            }}
                            className="absolute right-4 top-5 z-10 px-4 py-2 rounded-2xl bg-white/10 text-[#F6F6F6] hover:bg-white/15 transition flex items-center gap-2"
                            aria-label="플레이리스트 편집"
                            title="편집"
                        >
                            <FiEdit3 size={16} />
                            <span className="text-sm font-semibold">편집</span>
                        </button>
                    )}

                    <div className="absolute inset-0 flex items-end">
                        <div className="px-10 pb-8 flex items-end gap-8 min-w-[1100px] shrink-0">
                            <div className="w-[228px] h-[228px] shrink-0" />

                            <div className="flex items-end gap-5">
                                <div className="min-w-0">
                                    {playlist.visibility === "public" && currentUserId !== playlist.user_id && (
                                        <button
                                            type="button"
                                            onClick={toggleLike}
                                            className={[
                                                "h-11 rounded-2xl flex items-center gap-2 transition",
                                                localLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                                            ].join(" ")}
                                            aria-label="좋아요"
                                            title="좋아요"
                                        >
                                            <MdFavorite size={22} className={localLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"} />
                                            <span className="text-sm tabular-nums">{localLikeCount.toLocaleString()}</span>
                                        </button>
                                    )}

                                    <div className="text-4xl font-semibold text-[#F6F6F6] leading-none truncate">{playlist.title}</div>

                                    <div className="mt-2 text-base text-[#F6F6F6]/60 truncate">
                                        {tracks.length}곡 · {totalPlaytime}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                                        if (tracks.length === 0) return;

                                        // 선택된 곡이 있으면 그것들만, 없으면 전체 재생
                                        const list = selectedCount > 0 ? [...checkedTracks] : tracks.map(toPlayerTrack);

                                        // 첫 번째 곡은 즉시 재생해야 하므로 API로 실제 URL을 받아옴
                                        if (list.length > 0) {
                                            try {
                                                const firstItem = list[0];
                                                if (firstItem.musicId !== undefined) {
                                                    const realUrl = await playTrack(firstItem.musicId);
                                                    if (realUrl) {
                                                        firstItem.audioUrl = realUrl;
                                                    }
                                                }
                                            } catch (err) {
                                                console.error("Failed to fetch first track URL:", err);
                                            }
                                        }

                                        playTracks(list);
                                    }}
                                    className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                                    aria-label="플레이리스트 재생"
                                    title="재생"
                                >
                                    <FaPlay size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="
                absolute left-10 top-28
                w-[228px] h-[228px]
                rounded-3xl overflow-hidden
                z-20 shadow-xl
                pointer-events-none
            "
                >
                    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                        {Array.from({ length: 4 }).map((_, i) => {
                            const url = resolveImgUrl(API_BASE, coverUrls[i] ?? null);
                            return (
                                <div key={i} className="w-full h-full bg-[#6b6b6b]/40">
                                    {url ? (
                                        <img
                                            src={url}
                                            alt={`cover-${i + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            draggable={false}
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#6b6b6b]/40" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 본문 */}
            <div className="mt-[70px] px-4 space-y-6">
                {/* ✅ ArtistTracksPage 톤으로 바꾼 곡 목록 박스 */}
                <section className="mt-4 mx-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden">
                    {/* 헤더 */}
                    <div className="px-8 pt-8 pb-6 border-b border-white/10 overflow-x-auto whitespace-nowrap no-scrollbar">
                        <div className="flex items-end justify-between">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold text-[#F6F6F6]">곡 전체보기</h2>
                                <div className="text-base text-white/40">총 {tracks.length}곡</div>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar">
                            {actions
                                .filter((a) => !(isSystemPl && a.key === "delete"))
                                .map((a) => {
                                    const disabled =
                                        (a.key === "play" || a.key === "shuffle" || a.key === "delete") && selectedCount === 0;

                                    const onClick = () => {
                                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

                                        if (a.key === "delete") {
                                            deleteSelected();
                                            return;
                                        }

                                        if (a.key === "play") {
                                            if (selectedCount === 0) return;
                                            setPendingPlay({ key: "play", tracks: checkedTracks });
                                            setPlayConfirmOpen(true);
                                            return;
                                        }

                                        if (a.key === "shuffle") {
                                            if (selectedCount === 0) return;
                                            setPendingPlay({ key: "shuffle", tracks: checkedTracks });
                                            setPlayConfirmOpen(true);
                                            return;
                                        }
                                    };

                                    return (
                                        <button
                                            key={a.key}
                                            type="button"
                                            disabled={disabled}
                                            onClick={onClick}
                                            className={[
                                                "shrink-0 px-4 py-2 rounded-2xl border border-[#f6f6f6]/10 text-base flex items-center gap-2.5 transition",
                                                disabled
                                                    ? "text-[#f6f6f6]/20 border-[#f6f6f6]/5 cursor-not-allowed"
                                                    : "text-[#f6f6f6]/80 hover:bg-[#f6f6f6]/10 hover:text-[#f6f6f6] hover:border-[#f6f6f6]/20",
                                            ].join(" ")}
                                        >
                                            {a.icon}
                                            {a.label}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>

                    {/* 리스트 헤더 */}
                    <div className="px-4 pt-4 border-b border-white/10">
                        <div
                            className={[
                                "px-4 grid items-center",
                                "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
                                "gap-x-4 pb-3 text-sm text-[#f6f6f6]/60",
                            ].join(" ")}
                        >
                            <input
                                type="checkbox"
                                className="accent-[#f6f6f6] cursor-pointer"
                                checked={allChecked}
                                onChange={(e) => toggleAll(e.target.checked)}
                                aria-label="전체 선택"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="col-span-2 px-2 border-l border-white/10">곡정보</div>
                            <div className="hidden min-[1200px]:block px-2 border-l border-white/10">앨범</div>
                            <div className="text-right px-2 border-r border-white/10">길이</div>
                        </div>
                    </div>

                    {/* 리스트 */}
                    <div className="divide-y divide-white/10 pb-6">
                        {tracks.length === 0 ? (
                            <div className="px-6 py-10 text-center text-base text-white/20">곡이 없습니다.</div>
                        ) : (
                            tracks.map((t) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const m: any = t?.music ?? {};
                                const album = getAlbumInfo(t);
                                const cover = resolveImgUrl(API_BASE, album.cover_image);
                                const artistName = getArtistName(t);

                                const dur =
                                    m?.duration
                                        ? `${Math.floor(m.duration / 60)}:${String(m.duration % 60).padStart(2, "0")}`
                                        : "0:00";

                                return (
                                    <div
                                        key={t.item_id}
                                        className={[
                                            "grid items-center",
                                            "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
                                            "gap-x-3 px-8 py-2 hover:bg-white/5 transition cursor-pointer group",
                                        ].join(" ")}
                                        onDoubleClick={async (e) => {
                                            if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                                            e.preventDefault();

                                            try {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                const m: any = t?.music ?? {};
                                                const musicId = m?.music_id ?? t.item_id;

                                                // GET API 호출하여 오디오 URL 획득
                                                const realUrl = await playTrack(musicId);

                                                // 전체 리스트 변환
                                                const allPlayerTracks = tracks.map(toPlayerTrack);
                                                const idx = allPlayerTracks.findIndex((x) => x.id === String(t.item_id));

                                                if (idx !== -1 && realUrl) {
                                                    allPlayerTracks[idx].audioUrl = realUrl;
                                                    playListAtIndex(allPlayerTracks, idx);
                                                } else {
                                                    // 혹시 실패하면 그냥 기존 로직대로(URL 없이) 혹은 알림
                                                    console.warn("Audio URL not found or index error", musicId);
                                                    if (idx !== -1) {
                                                        playListAtIndex(allPlayerTracks, idx);
                                                    }
                                                }
                                            } catch (err) {
                                                console.error("Failed to play track via GET API:", err);
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="accent-[#f6f6f6]"
                                            checked={!!checkedIds[t.item_id]}
                                            onChange={() => toggleOne(t.item_id)}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`${m?.title ?? "곡"} 선택`}
                                        />

                                        <div className="ml-2 w-12 h-12 rounded-xl bg-white/5 overflow-hidden relative flex-shrink-0 shadow-lg">
                                            {cover ? (
                                                <img
                                                    src={cover}
                                                    alt={album.title}
                                                    className="w-full h-full object-cover relative z-10"
                                                    loading="lazy"
                                                    decoding="async"
                                                    fetchPriority="low"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-white/5" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="ml-1 text-base text-[#f6f6f6] truncate group-hover:text-[#AFDEE2] transition-colors">
                                                {m?.title ?? m?.music_name ?? "(제목 없음)"}
                                            </div>
                                            <div className="ml-1 text-sm text-white/30 truncate">{artistName}</div>
                                        </div>

                                        <div className="hidden min-[1200px]:block ml-1 text-base text-white/50 truncate">
                                            {album.title}
                                        </div>

                                        <div className="mr-1 text-base text-white/70 text-right tabular-nums group-hover:text-[#AFDEE2]/70 transition-colors">
                                            {dur}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            {/* ✅ 재생 방식 선택 모달: BaseModal로 교체 (Portal + ESC + body scroll lock) */}
            <BaseModal
                open={playConfirmOpen && !!pendingPlay}
                onClose={() => {
                    setPlayConfirmOpen(false);
                    setPendingPlay(null);
                }}
                title="재생 방식 선택"
                maxWidthClass="max-w-[440px]"
            >
                {pendingPlay && (
                    <>
                        <div className="px-6 py-4 text-base text-[#F6F6F6]/70">
                            선택한 {pendingPlay.tracks.length}곡을 {pendingPlay.key === "shuffle" ? "셔플로 " : ""}어떻게
                            재생할까요?
                        </div>

                        <div className="px-6 pb-6 grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={() => runPendingPlay("replace")}
                                className="w-full px-4 py-3 rounded-2xl text-base text-[#F6F6F6] outline outline-1 outline-white/10 hover:bg-white/10 transition text-left"
                            >
                                <div className="font-semibold text-[#afdee2]">현재 재생 대기목록 지우고 재생</div>
                                <div className="mt-1 text-xs text-[#999]">
                                    지금 재생 대기목록을 초기화하고 선택한 곡들로 새로 재생합니다.
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => runPendingPlay("enqueue")}
                                className="w-full px-4 py-3 rounded-2xl text-base text-[#F6F6F6] outline outline-1 outline-white/10 hover:bg-white/10 transition text-left"
                            >
                                <div className="font-semibold text-[#afdee2]">재생 대기목록 맨 뒤에 추가</div>
                                <div className="mt-1 text-xs text-[#999]">
                                    현재 재생은 유지하고, 선택한 곡들을 재생 대기 목록 마지막에 둡니다.
                                </div>
                            </button>
                        </div>

                        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setPlayConfirmOpen(false);
                                    setPendingPlay(null);
                                }}
                                className="px-4 py-2 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition"
                            >
                                취소
                            </button>
                        </div>
                    </>
                )}
            </BaseModal>
        </div>
    );
}
