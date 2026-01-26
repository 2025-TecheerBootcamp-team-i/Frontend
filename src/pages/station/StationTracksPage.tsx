import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { createPortal } from "react-dom";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import {
    fetchDjStations,
    type StationCategory,
    type StationTrack,
} from "../../api/station";

import {
    getPlaylistById,
    getUserPlaylists,
    subscribePlaylists,
    updatePlaylist,
    LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";
import { requireLogin } from "../../api/auth";

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
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

/* =====================
    Modal (Portal) - Reusing logic
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

/* ===================== 컴포넌트 ===================== */

export default function StationTracksPage() {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();

    // Decode URL parameter
    const decodedCategory = category ? decodeURIComponent(category) : "";

    const [station, setStation] = useState<StationCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    // ✅ PlayerContext
    const { playTracks, enqueueTracks } = usePlayer();

    // Fetch Station Data
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const stations = await fetchDjStations();
                if (!alive) return;

                // Search through all sections to find the matching category
                // Flatten all station_data from all sections
                const allCategories = stations.flatMap(section => section.station_data);

                // Try exact match first, then case-insensitive
                const found = allCategories.find((s) => s.category === decodedCategory) ||
                    allCategories.find((s) => s.category.toLowerCase() === decodedCategory.toLowerCase());

                if (found) {
                    setStation(found);
                    setError(null);
                } else {
                    setError("스테이션을 찾을 수 없습니다.");
                    setStation(null);
                }
            } catch (err) {
                if (!alive) return;
                console.error("Failed to load station:", err);
                setError("스테이션 로딩 실패");
                setStation(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [decodedCategory]);

    const tracks = station?.tracks || [];
    const stationName = station?.category || "";

    const handlePlayById = async (track: StationTrack) => {
        try {
            // Mock Play Logic using ID
            setPlayingId(String(track.music_id));

            // In a real scenario, we might call an API to get the stream URL.
            // For now, assuming direct mapping or using standard endpoint pattern.
            const playerTrack: PlayerTrack = {
                id: String(track.music_id),
                musicId: track.music_id,
                title: track.music_name,
                artist: track.artist,
                album: stationName,
                duration: formatSeconds(track.duration),
                audioUrl: `/api/tracks/${track.music_id}/stream`, // Constructing stream URL
                coverUrl: track.album_image ?? undefined,
            };

            playTracks([playerTrack], { shuffle: false });
        } catch (e) {
            console.error("[StationDetailPage] play error:", e);
            alert("재생 중 오류가 발생했습니다.");
        } finally {
            setPlayingId(null);
        }
    };

    /* ===================== 체크박스 ===================== */

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    // Using music_id as unique identifier (converted to string for keys)
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

    type PendingPlay = {
        key: ActionKey;
        tracks: PlayerTrack[];
    };

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    const runPendingPlay = (mode: "replace" | "enqueue") => {
        if (!pendingPlay) return;
        const isShuffle = pendingPlay.key === "shuffle";

        if (mode === "replace") playTracks(pendingPlay.tracks, { shuffle: isShuffle });
        else enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });

        setCheckedIds({});
        setPendingPlay(null);
        setPlayConfirmOpen(false);
    };

    /* ===================== 담기 모달 ===================== */

    const [addOpen, setAddOpen] = useState(false);
    const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

    useEffect(() => {
        const sync = () => setAddTargets(getUserPlaylists());
        sync();
        return subscribePlaylists(sync);
    }, []);

    const toPlayerTrack = (t: StationTrack): PlayerTrack => ({
        id: String(t.music_id),
        musicId: t.music_id,
        title: t.music_name,
        artist: t.artist,
        album: stationName,
        duration: formatSeconds(t.duration),
        audioUrl: `/api/tracks/${t.music_id}/stream`,
        coverUrl: t.album_image ?? undefined,
    });

    const toMockTrack = (t: StationTrack) => ({
        id: String(t.music_id),
        title: t.music_name,
        artist: t.artist,
        album: stationName,
        duration: formatSeconds(t.duration),
        likeCount: t.likes,
        kind: "track" as const,
    });

    const addSelectedToPlaylist = async (playlistId: string) => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(playlistId);
        if (!curr) return;

        const incoming = checkedTracks.map(toMockTrack);

        const exists = new Set(curr.tracks.map((x) => x.id));
        const merged = [...curr.tracks];

        for (const tr of incoming) {
            if (exists.has(tr.id)) continue;
            merged.push(tr);
            exists.add(tr.id);
        }

        updatePlaylist(playlistId, { tracks: merged });
        setAddOpen(false);
        setCheckedIds({});
    };

    const addSelectedToLiked = async () => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(LIKED_SYSTEM_ID);
        if (!curr) return;

        const incoming = checkedTracks.map(toMockTrack);

        const exists = new Set(curr.tracks.map((x) => x.id));
        const merged = [...curr.tracks];

        for (const tr of incoming) {
            if (exists.has(tr.id)) continue;
            merged.push(tr);
            exists.add(tr.id);
        }

        updatePlaylist(LIKED_SYSTEM_ID, { tracks: merged });
        setCheckedIds({});
    };

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
            <div className="w-full min-w-0 px-6 py-5 text-white">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-6 text-[#aaa] hover:text-white transition"
                    aria-label="뒤로가기"
                >
                    <IoChevronBack size={24} />
                </button>
                <div className="text-center py-12 text-[#999]">로딩 중...</div>
            </div>
        );
    }

    if (!station || error) {
        return (
            <div className="w-full min-w-0 px-6 py-5 text-white">
                <button type="button" onClick={() => navigate(-1)} className="mb-6 text-[#aaa] hover:text-white transition">
                    <IoChevronBack size={24} />
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="text-xl font-semibold">스테이션을 찾을 수 없어요.</div>
                    <div className="mt-2 text-sm text-[#aaa]">
                        요청한 카테고리: <span className="text-white">{decodedCategory}</span>
                    </div>
                    {error && <div className="mt-2 text-sm text-red-400">오류: {error}</div>}
                </div>
            </div>
        );
    }

    /* ===================== JSX (SearchSong 스타일 적용) ===================== */

    return (
        <>
            <div className="w-full min-w-0">
                {/* 상단 sticky 헤더 */}
                <div className="sticky top-0 z-20 pt-5 px-4 pb-4 mb-4 bg-white/[0.05] backdrop-blur-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                            aria-label="뒤로가기"
                        >
                            <IoChevronBack size={24} />
                        </button>
                        <h1 className="text-xl font-semibold text-[#F6F6F6]">{station.category} · 전체 곡</h1>
                    </div>
                </div>

                {/* ✅ SearchSong 카드 톤 */}
                <section className="mt-4 mx-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden">
                    {/* 헤더 */}
                    <div className="px-8 pt-8 pb-6 border-b border-white/10 overflow-x-auto whitespace-nowrap no-scrollbar">
                        <div className="flex items-end justify-between">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold text-[#F6F6F6]">곡 전체보기</h2>

                                {error ? (
                                    <div className="text-base text-red-400">오류: {error}</div>
                                ) : (
                                    <div className="text-base text-white/40">총 {tracks.length}곡</div>
                                )}
                            </div>
                        </div>

                        {/* 액션 버튼 */}
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
                                // Adjusted columns: Checkbox | AlbumArt | Title/Artist | Album(Category) | Likes | Duration
                                "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_200px_90px_90px]",
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
                            <div className="hidden min-[1200px]:block px-2 border-l border-white/10">스테이션</div>
                            <div className="hidden min-[1200px]:block text-right px-2 border-l border-white/10">좋아요</div>
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
                                        "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_200px_90px_90px]",
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

                                    {/* 앨범 이미지 - SearchSong 톤 */}
                                    <div className="ml-2 w-12 h-12 rounded-xl bg-white/5 overflow-hidden relative flex-shrink-0 shadow-lg">
                                        {t.album_image ? (
                                            <img
                                                src={t.album_image}
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
                                        <div className="ml-1 text-sm text-white/30 truncate">{t.artist}</div>
                                    </div>

                                    <div className="hidden min-[1200px]:block ml-1 text-base text-white/50 truncate">
                                        {stationName}
                                    </div>

                                    <div className="hidden min-[1200px]:block ml-1 text-base text-white/50 text-right tabular-nums">
                                        {t.likes}
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

            {/* ✅ 담기 모달 (BaseModal로 통일) */}
            <BaseModal open={addOpen} onClose={() => setAddOpen(false)} title="플레이리스트 선택" maxWidthClass="max-w-[420px]">
                <div className="px-6 py-4 text-base text-[#F6F6F6]/70">
                    선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
                </div>

                <div className="max-h-[360px] overflow-y-auto border-t border-white/10">
                    {addTargets.length === 0 ? (
                        <div className="px-6 py-6 text-base text-[#aaa]">담을 수 있는 플레이리스트가 없어요.</div>
                    ) : (
                        addTargets
                            .filter((p) => p.id !== LIKED_SYSTEM_ID)
                            .map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => addSelectedToPlaylist(p.id)}
                                    className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                                >
                                    <div className="text-base font-semibold text-[#F6F6F6] truncate">{p.title}</div>
                                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                                        {p.owner} · {p.isPublic ? "공개" : "비공개"}
                                    </div>
                                </button>
                            ))
                    )}
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setAddOpen(false)}
                        className="px-4 py-2 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition"
                    >
                        취소
                    </button>
                </div>
            </BaseModal>

            {/* ✅ 재생 방식 선택 모달 (BaseModal로 통일) */}
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
                            선택한 {pendingPlay.tracks.length}곡을 {pendingPlay.key === "shuffle" ? "셔플로 " : ""}어떻게 재생할까요?
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
        </>
    );
}
