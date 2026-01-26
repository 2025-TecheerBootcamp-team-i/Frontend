// src/pages/station/StationPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import { createPortal } from "react-dom";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { fetchDjStations, type StationCategory, type StationTrack } from "../../api/station";
import { requireLogin } from "../../api/auth";

import { CATEGORY_STYLES } from "../home/DjStationSection";
import { GENRE_IMAGES } from "../home/GenreStationSection";

// ✅ 실데이터 API (ChartTop100 / SearchSong 방식)
import { listMyPlaylists, addPlaylistItems, type PlaylistSummary } from "../../api/playlist";
import { likeTrack } from "../../api/LikedSong";

/* ===================== 액션 ===================== */

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type ActionKey = (typeof actions)[number]["key"];

function formatSeconds(sec: number | null | undefined): string {
    if (typeof sec !== "number" || Number.isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

/* =====================
    Modal (Portal)
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
    maxWidthClass = "max-w-[420px]",
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
            <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="닫기" />
            <div className="absolute inset-0 grid place-items-center p-6">
            <div
                className={`w-full ${maxWidthClass} rounded-3xl bg-[#3d3d3d]/80 border border-white/10 shadow-2xl overflow-hidden`}
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

/* =========================
    Playlist Pick Modal (실데이터)
========================= */

type PlaylistPickModalProps = {
    open: boolean;
    onClose: () => void;
    selectedCount: number;

    loading: boolean;
    error: string | null;
    targets: PlaylistSummary[];

    onPick: (playlistId: string) => void;
};

function PlaylistPickModal({ open, onClose, selectedCount, loading, error, targets, onPick }: PlaylistPickModalProps) {
    return (
        <BaseModal open={open} onClose={onClose} title="플레이리스트 선택" maxWidthClass="max-w-[420px]">
        <div className="px-6 py-4 text-base text-[#F6F6F6]/70">선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요</div>

        <div className="max-h-[360px] overflow-y-auto border-t border-white/10">
            {loading ? (
            <div className="px-6 py-6 text-base text-[#aaa]">플레이리스트 불러오는 중...</div>
            ) : error ? (
            <div className="px-6 py-6 text-base text-red-400">오류: {error}</div>
            ) : targets.length === 0 ? (
            <div className="px-6 py-6 text-base text-[#aaa]">담을 수 있는 플레이리스트가 없어요.</div>
            ) : (
            targets.map((p) => (
                <button
                key={p.playlist_id}
                type="button"
                onClick={() => onPick(String(p.playlist_id))}
                className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-white/10"
                >
                <div className="text-base font-semibold text-[#F6F6F6] truncate">{p.title}</div>
                <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {p.creator_nickname} · {p.visibility === "public" ? "공개" : "비공개"}
                </div>
                </button>
            ))
            )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition">
            취소
            </button>
        </div>
        </BaseModal>
    );
}

/* =========================
    Play Mode Confirm Modal
========================= */

type PendingPlay = { key: ActionKey; tracks: PlayerTrack[] };

type PlayModeConfirmModalProps = {
    open: boolean;
    onClose: () => void;
    pending: PendingPlay | null;
    onChoose: (mode: "replace" | "enqueue") => void;
};

function PlayModeConfirmModal({ open, onClose, pending, onChoose }: PlayModeConfirmModalProps) {
    const count = pending?.tracks.length ?? 0;
    const isShuffle = pending?.key === "shuffle";

    return (
        <BaseModal open={open && !!pending} onClose={onClose} title="재생 방식 선택" maxWidthClass="max-w-[440px]">
        <div className="px-6 py-4 text-base text-[#F6F6F6]/70">
            선택한 {count}곡을 {isShuffle ? "셔플로 " : ""}어떻게 재생할까요?
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 gap-3">
            <button
            type="button"
            onClick={() => onChoose("replace")}
            className="w-full px-4 py-3 rounded-2xl text-base text-[#F6F6F6] outline outline-1 outline-white/10 hover:bg-white/10 transition text-left"
            >
            <div className="font-semibold text-[#afdee2]">현재 재생 대기목록 지우고 재생</div>
            <div className="mt-1 text-xs text-[#999]">지금 재생 대기목록을 초기화하고 선택한 곡들로 새로 재생합니다.</div>
            </button>

            <button
            type="button"
            onClick={() => onChoose("enqueue")}
            className="w-full px-4 py-3 rounded-2xl text-base text-[#F6F6F6] outline outline-1 outline-white/10 hover:bg-white/10 transition text-left"
            >
            <div className="font-semibold text-[#afdee2]">재생 대기목록 맨 뒤에 추가</div>
            <div className="mt-1 text-xs text-[#999]">현재 재생은 유지하고, 선택한 곡들을 재생 대기 목록 마지막에 둡니다.</div>
            </button>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition">
            취소
            </button>
        </div>
        </BaseModal>
    );
}

/* =========================
    Page Component
========================= */

export default function StationPage() {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();

    // ✅ PlayerContext
    const { playTracks, enqueueTracks } = usePlayer();

    const decodedCategory = category ? decodeURIComponent(category) : "";

    const [station, setStation] = useState<StationCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    /* ===================== Fetch Station ===================== */

    useEffect(() => {
        let alive = true;
        (async () => {
        try {
            setLoading(true);
            const stations = await fetchDjStations();
            if (!alive) return;

            const allCategories = stations.flatMap((section) => section.station_data);

            const found =
            allCategories.find((s) => s.category === decodedCategory) ||
            allCategories.find((s) => s.category.toLowerCase() === decodedCategory.toLowerCase());

            if (found) {
            setStation(found);
            setError(null);
            } else {
            setStation(null);
            setError("스테이션을 찾을 수 없습니다.");
            }
        } catch {
            if (!alive) return;
            setStation(null);
            setError("스테이션 로딩 실패");
        } finally {
            if (alive) setLoading(false);
        }
        })();

        return () => {
        alive = false;
        };
    }, [decodedCategory]);

    /* ===================== Header Image ===================== */

    const stationImage = useMemo(() => {
        if (!decodedCategory) return null;

        const style = CATEGORY_STYLES[decodedCategory];
        if (style) {
        const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        return match ? match[1] : null;
        }

        const exactGenre = GENRE_IMAGES[decodedCategory];
        if (exactGenre) return exactGenre;

        const lowerCategory = decodedCategory.toLowerCase();
        const foundKey = Object.keys(GENRE_IMAGES).find((k) => k.toLowerCase() === lowerCategory);
        if (foundKey) return GENRE_IMAGES[foundKey];

        return null;
    }, [decodedCategory]);

    const tracks = station?.tracks || [];
    const stationName = station?.category || "";

    /* ===================== Play ===================== */

    const handlePlayAll = () => {
        if (!tracks.length) return;
        if (!requireLogin()) return;

        const list: PlayerTrack[] = tracks.map((t) => ({
        id: String(t.music_id),
        musicId: t.music_id,
        title: t.music_name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artist: (t as any).artist_name || (t as any).artist || "",
        album: stationName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        coverUrl: (t as any).album_image ?? undefined,
        duration: t.duration ? formatSeconds(t.duration) : "0:00",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioUrl: (t as any).audio_url || `/api/tracks/${t.music_id}/stream`,
        }));

        playTracks(list);
    };

    const handlePlayById = async (track: StationTrack) => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

        try {
        setPlayingId(String(track.music_id));

        const playerTrack: PlayerTrack = {
            id: String(track.music_id),
            musicId: track.music_id,
            title: track.music_name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            artist: (track as any).artist_name || (track as any).artist || "",
            album: stationName,
            duration: formatSeconds(track.duration),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            audioUrl: (track as any).audio_url || `/api/tracks/${track.music_id}/stream`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            coverUrl: (track as any).album_image ?? undefined,
        };

        playTracks([playerTrack], { shuffle: false });
        } catch (e) {
        console.error("[StationPage] play error:", e);
        alert("재생 중 오류가 발생했습니다.");
        } finally {
        setPlayingId(null);
        }
    };

    /* ===================== 체크박스 ===================== */

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[String(t.music_id)]);
    const someChecked = tracks.some((t) => checkedIds[String(t.music_id)]) && !allChecked;

    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked;
    }, [someChecked]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[String(t.music_id)] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const checkedTracks = useMemo(() => tracks.filter((t) => checkedIds[String(t.music_id)]), [tracks, checkedIds]);
    const selectedCount = checkedTracks.length;

    /* ===================== 재생 모달 상태 ===================== */

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    const toPlayerTrack = (t: StationTrack): PlayerTrack => ({
        id: String(t.music_id),
        musicId: t.music_id,
        title: t.music_name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artist: (t as any).artist_name || (t as any).artist || "",
        album: stationName,
        duration: formatSeconds(t.duration),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioUrl: (t as any).audio_url || `/api/tracks/${t.music_id}/stream`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        coverUrl: (t as any).album_image ?? undefined,
    });

    const runPendingPlay = (mode: "replace" | "enqueue") => {
        if (!pendingPlay) return;
        const isShuffle = pendingPlay.key === "shuffle";

        if (mode === "replace") playTracks(pendingPlay.tracks, { shuffle: isShuffle });
        else enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });

        setCheckedIds({});
        setPendingPlay(null);
        setPlayConfirmOpen(false);
    };

    const closePlayConfirm = () => {
        setPlayConfirmOpen(false);
        setPendingPlay(null);
    };

    /* =========================
        ✅ 담기 모달 (실데이터)
    ========================= */

    const [addOpen, setAddOpen] = useState(false);
    const [addTargets, setAddTargets] = useState<PlaylistSummary[]>([]);
    const [addTargetsLoading, setAddTargetsLoading] = useState(false);
    const [addTargetsError, setAddTargetsError] = useState<string | null>(null);

    // 모달 열릴 때 내 플레이리스트 불러오기
    useEffect(() => {
        if (!addOpen) return;

        let cancelled = false;

        (async () => {
        try {
            setAddTargetsLoading(true);
            setAddTargetsError(null);

            const data = await listMyPlaylists();
            if (cancelled) return;

            // ✅ 시스템 플레이리스트 제외 (ChartTop100 방식)
            const filtered = data.filter((p) => p.visibility !== "system");
            setAddTargets(filtered);
        } catch (e) {
            console.error("[StationPage] 플레이리스트 목록 불러오기 실패:", e);
            if (cancelled) return;
            setAddTargets([]);
            setAddTargetsError(e instanceof Error ? e.message : "플레이리스트 목록을 불러오지 못했어요.");
        } finally {
            if (!cancelled) setAddTargetsLoading(false);
        }
        })();

        return () => {
        cancelled = true;
        };
    }, [addOpen]);

    const addSelectedToPlaylist = useCallback(
        async (playlistId: string) => {
        if (selectedCount === 0) return;

        try {
            const musicIds = checkedTracks
            .map((t) => Number(t.music_id))
            .filter((id) => Number.isFinite(id));

            const unique = Array.from(new Set(musicIds));
            if (unique.length === 0) return;

            await addPlaylistItems(playlistId, unique);

            setAddOpen(false);
            setCheckedIds({});
        } catch (e) {
            console.error("[StationPage] 플레이리스트 담기 실패:", e);
            alert("플레이리스트에 담기 실패했어요. 잠시 후 다시 시도해주세요.");
        }
        },
        [checkedTracks, selectedCount]
    );

    const addSelectedToLiked = useCallback(async () => {
        if (selectedCount === 0) return;

        try {
        const musicIds = checkedTracks
            .map((t) => Number(t.music_id))
            .filter((id) => Number.isFinite(id));

        const unique = Array.from(new Set(musicIds));
        if (unique.length === 0) return;

        const results = await Promise.allSettled(
            unique.map(async (id) => {
            await likeTrack(id);
            return id;
            })
        );

        const ok = results.filter((r) => r.status === "fulfilled").length;
        const fail = results.length - ok;

        setCheckedIds({});
        if (fail === 0) alert(`좋아요 완료: ${ok}곡`);
        else alert(`좋아요 완료: ${ok}곡 / 실패: ${fail}곡`);
        } catch (e) {
        console.error("[StationPage] 좋아요 실패:", e);
        alert("좋아요 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    }, [checkedTracks, selectedCount]);

    /* ===================== 액션 ===================== */

    const handleAction = async (key: ActionKey) => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (selectedCount === 0) return;

        if (key === "play" || key === "shuffle") {
        setPendingPlay({ key, tracks: checkedTracks.map(toPlayerTrack) });
        setPlayConfirmOpen(true);
        return;
        }

        if (key === "add") {
        setAddOpen(true);
        return;
        }

        if (key === "like") {
        await addSelectedToLiked();
        return;
        }
    };

    /* ===================== early return ===================== */

    if (loading) {
        return (
        <div className="w-full min-h-screen bg-[#1D1D1D] text-white flex items-center justify-center">
            <div className="text-white/60">로딩 중...</div>
        </div>
        );
    }

    if (!station || error) {
        return (
        <div className="w-full min-h-screen bg-[#1D1D1D] text-white p-6">
            <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                navigate("/home");
            }}
            className="mb-6 text-[#aaa] hover:text-white relative z-50"
            >
            <IoChevronBack size={24} />
            </button>
            <div className="text-xl font-semibold">스테이션을 찾을 수 없어요.</div>
            {error && <div className="mt-2 text-red-400">{error}</div>}
        </div>
        );
    }

    return (
        <>
        <div className="w-full min-w-0 overflow-x-auto pb-20">
            {/* Header / Banner */}
            <section className="relative overflow-visible">
            <div className="relative h-72 bg-[#1D1D1D]/70 border-b border-[#3D3D3D] overflow-hidden">
                {stationImage && (
                <img
                    src={stationImage}
                    alt=""
                    className="absolute inset-0 z-0 w-full h-full object-cover scale-125 blur-3xl opacity-60"
                />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1D1D1D]/10 via-[#1D1D1D]/65 to-[#1D1D1D] z-[1]" />

                <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    navigate("/home");
                }}
                className="absolute left-4 top-5 z-[200] p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                <IoChevronBack size={24} />
                </button>

                <div className="absolute inset-0 flex items-end z-10">
                <div className="px-10 pb-8 flex items-end gap-8 min-w-[800px] shrink-0">
                    <div className="w-[228px] h-[228px] shrink-0" />
                    <div className="flex items-end gap-5">
                    <div>
                        <div className="text-4xl font-semibold text-[#F6F6F6] leading-none mb-2">{station.category}</div>
                        <div className="text-base text-[#F6F6F6]/60">DJ 스테이션</div>
                    </div>
                    <button
                        onClick={handlePlayAll}
                        className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                    >
                        <FaPlay size={16} />
                    </button>
                    </div>
                </div>
                </div>
            </div>

            <div className="absolute left-10 top-28 w-[228px] h-[228px] rounded-full overflow-hidden z-20 shadow-xl">
                {stationImage ? (
                <img src={stationImage} alt={station.category} className="w-full h-full object-cover" />
                ) : (
                <div className="w-full h-full bg-gray-700" />
                )}
            </div>
            </section>

            {/* ===================== Body Content ===================== */}
            <div className="mt-[70px] px-4 space-y-6">
            <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="px-8 pt-8 pb-6 border-b border-white/10 overflow-x-auto whitespace-nowrap no-scrollbar">
                <div className="flex items-end justify-between">
                    <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-[#F6F6F6]">곡 전체보기</h2>
                    <div className="text-base text-white/40">총 {tracks.length}곡</div>
                    </div>
                </div>

                <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar">
                    {actions.map((a) => (
                    <button
                        key={a.key}
                        type="button"
                        disabled={selectedCount === 0}
                        onClick={() => handleAction(a.key)}
                        className={[
                        "shrink-0 px-4 py-2 rounded-2xl border border-[#f6f6f6]/10 text-base flex items-center gap-2.5 transition",
                        selectedCount === 0
                            ? "text-[#f6f6f6]/20 border-[#f6f6f6]/5 cursor-not-allowed"
                            : "text-[#f6f6f6]/80 hover:bg-[#f6f6f6]/10 hover:text-[#f6f6f6] hover:border-[#f6f6f6]/20",
                        ].join(" ")}
                    >
                        {a.icon}
                        {a.label}
                    </button>
                    ))}
                </div>
                </div>

                {/* 리스트 헤더 */}
                <div className="px-4 pt-4 border-b border-white/10">
                <div
                    className={[
                    "px-4 grid items-center",
                    "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_90px]",
                    "gap-x-4 pb-3 text-sm text-[#f6f6f6]/60",
                    ].join(" ")}
                >
                    <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="accent-[#f6f6f6] cursor-pointer"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                    />
                    <div className="col-span-2 px-2 border-l border-white/10">곡정보</div>
                    <div className="text-right px-2 border-r border-white/10">길이</div>
                </div>
                </div>

                {/* 리스트 */}
                <div className="divide-y divide-white/10">
                {tracks.length === 0 ? (
                    <div className="px-6 py-10 text-center text-base text-white/20">곡이 없습니다.</div>
                ) : (
                    tracks.map((t) => (
                    <div
                        key={t.music_id}
                        className={[
                        "grid items-center",
                        "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_90px]",
                        "gap-x-3 px-8 py-2 hover:bg-white/5 transition cursor-pointer group",
                        ].join(" ")}
                        onDoubleClick={(e) => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        e.preventDefault();
                        if (playingId) return;
                        void handlePlayById(t);
                        }}
                    >
                        <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={!!checkedIds[String(t.music_id)]}
                        onChange={() => toggleOne(String(t.music_id))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${t.music_name} 선택`}
                        />

                        <div className="ml-2 w-12 h-12 rounded-xl bg-white/5 overflow-hidden relative flex-shrink-0 shadow-lg">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(t as any).album_image ? (
                            <img
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            src={(t as any).album_image}
                            alt={t.music_name}
                            className="w-full h-full object-cover relative z-10"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                            />
                        ) : (
                            <div className="w-full h-full bg-white/5" />
                        )}
                        </div>

                        <div className="min-w-0">
                        <div className="ml-1 text-base text-[#f6f6f6] truncate group-hover:text-[#AFDEE2] transition-colors">
                            {t.music_name}
                        </div>
                        <div className="ml-1 text-sm text-white/30 truncate">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(t as any).artist_name || (t as any).artist || ""}
                        </div>
                        </div>

                        <div className="mr-1 text-base text-white/70 text-right tabular-nums group-hover:text-[#AFDEE2]/70 transition-colors">
                        {formatSeconds(t.duration)}
                        </div>
                    </div>
                    ))
                )}
                </div>
            </section>
            </div>
        </div>

        {/* ✅ 담기 모달 (실데이터) */}
        <PlaylistPickModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            selectedCount={selectedCount}
            loading={addTargetsLoading}
            error={addTargetsError}
            targets={addTargets}
            onPick={(id) => addSelectedToPlaylist(id)}
        />

        {/* ✅ 재생 방식 선택 모달 */}
        <PlayModeConfirmModal
            open={playConfirmOpen}
            pending={pendingPlay}
            onClose={closePlayConfirm}
            onChoose={(mode) => runPendingPlay(mode)}
        />
        </>
    );
}
