// src/pages/chart/ChartTop100.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

import { FaPlay } from "react-icons/fa6";
import { IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";

import { fetchChart, type ChartData, type ChartRow as ApiChartRow } from "../../api/chart";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";

// ✅ 실제 API (SearchSong과 동일한 방식)
import { listMyPlaylists, addPlaylistItems, type PlaylistSummary } from "../../api/playlist";
// (선택) 좋아요도 진짜 API로 할 거면 SearchSong처럼 likeTrack 사용
import { likeTrack } from "../../api/LikedSong";

/* =========================
    Utils
========================= */

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type ActionKey = (typeof actions)[number]["key"];

const formatDuration = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

const formatGeneratedAt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
        d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* =========================
    Modal Portal + Base Modal
========================= */

function ModalPortal({ children }: { children: React.ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

type BaseModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidthClass?: string;
};

function BaseModal({ open, title, onClose, children, maxWidthClass = "max-w-[420px]" }: BaseModalProps) {
    // ESC 닫기
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    // 바디 스크롤 잠금
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

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

function PlaylistPickModal({
    open,
    onClose,
    selectedCount,
    loading,
    error,
    targets,
    onPick,
}: PlaylistPickModalProps) {
    return (
        <BaseModal open={open} onClose={onClose} title="플레이리스트 선택" maxWidthClass="max-w-[420px]">
            <div className="px-6 py-4 text-base text-[#F6F6F6]/70">
                선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
            </div>

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

type PendingPlay = {
    key: ActionKey;
    tracks: PlayerTrack[];
};

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

export default function ChartTop100() {
    const GRID = "grid-cols-[44px_90px_1.2fr_1fr_200px]";

    const { setTrackAndPlay, playTracks, enqueueTracks } = usePlayer();

    // Chart API 상태
    const [chart, setChart] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const rows = useMemo(() => {
        if (!chart) return [];
        const seen = new Set<string>();
        return chart.items.filter((item) => {
            if (seen.has(item.musicId)) return false;
            seen.add(item.musicId);
            return true;
        });
    }, [chart]);

    const toTrack = (row: ApiChartRow): PlayerTrack => ({
        id: row.musicId,
        musicId: Number(row.musicId),
        title: row.musicName,
        artist: row.artistName,
        album: row.albumName,
        duration: formatDuration(row.durationSec),
        isAi: row.isAi,
        audioUrl: row.audioUrl || "/audio/sample.mp3",
        coverUrl: row.albumImage,
    });

    // 체크박스
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const allChecked = rows.length > 0 && rows.every((r) => checkedIds[r.musicId]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        rows.forEach((r) => (obj[r.musicId] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const checkedRows = useMemo(() => rows.filter((r) => !!checkedIds[r.musicId]), [rows, checkedIds]);
    const checkedTracks = useMemo(() => checkedRows.map(toTrack), [checkedRows]);
    const selectedCount = checkedTracks.length;

    // 차트 로드
    const prevRankByIdRef = useRef<Record<string, number>>({});

    useEffect(() => {
        let alive = true;

        const load = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                const data = await fetchChart("realtime");
                if (!alive) return;

                const prev = prevRankByIdRef.current;
                const nextDiff: Record<string, number> = {};
                for (const item of data.items) {
                    const id = item.musicId;
                    const prevRank = prev[id];
                    nextDiff[id] = typeof prevRank === "number" ? prevRank - item.rank : 0;
                }

                setChart(data);

                const nextPrev: Record<string, number> = {};
                for (const item of data.items) nextPrev[item.musicId] = item.rank;
                prevRankByIdRef.current = nextPrev;
            } catch (err) {
                if (!alive) return;
                console.error(err);
                setChart(null);
                setErrorMsg("차트 데이터를 불러오지 못했어요.");
            } finally {
                if (alive) setLoading(false);
            }
        };

        load();
        const timer = window.setInterval(load, 10 * 60 * 1000);

        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, []);

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

                // 시스템 플레이리스트 제외
                const filtered = data.filter((p) => p.visibility !== "system");
                setAddTargets(filtered);
            } catch (e) {
                console.error("[ChartTop100] 플레이리스트 목록 불러오기 실패:", e);
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
                // ✅ 차트는 musicId를 이미 갖고 있음 → 그대로 담기
                const musicIds = checkedRows
                    .map((r) => Number(r.musicId))
                    .filter((id) => Number.isFinite(id));

                const unique = Array.from(new Set(musicIds));
                if (unique.length === 0) return;

                await addPlaylistItems(playlistId, unique);

                setAddOpen(false);
                setCheckedIds({});
            } catch (e) {
                console.error("[ChartTop100] 플레이리스트 담기 실패:", e);
                alert("플레이리스트에 담기 실패했어요. 잠시 후 다시 시도해주세요.");
            }
        },
        [checkedRows, selectedCount]
    );

    // ✅ 좋아요도 진짜 API로 하고 싶으면 (SearchSong처럼)
    const addSelectedToLiked = useCallback(async () => {
        if (selectedCount === 0) return;

        try {
            const musicIds = checkedRows
                .map((r) => Number(r.musicId))
                .filter((id) => Number.isFinite(id));

            const unique = Array.from(new Set(musicIds));
            if (unique.length === 0) return;

            // 병렬 + 부분 실패 허용 (이미 좋아요 등)
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
            console.error("[ChartTop100] 좋아요 실패:", e);
            alert("좋아요 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    }, [checkedRows, selectedCount]);

    /* =========================
        재생 방식 모달
    ========================= */

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    const runPendingPlay = (mode: "replace" | "enqueue") => {
        if (!pendingPlay) return;
        const isShuffle = pendingPlay.key === "shuffle";

        if (mode === "replace") {
            playTracks(pendingPlay.tracks, { shuffle: isShuffle });
        } else {
            enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });
        }

        setCheckedIds({});
        setPendingPlay(null);
        setPlayConfirmOpen(false);
    };

    const closePlayConfirm = () => {
        setPlayConfirmOpen(false);
        setPendingPlay(null);
    };

    // 액션
    const handleAction = (key: ActionKey) => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

        const needsSelection = key === "play" || key === "shuffle" || key === "add" || key === "like";
        if (needsSelection && selectedCount === 0) return;

        if (key === "play" || key === "shuffle") {
            setPendingPlay({ key, tracks: checkedTracks });
            setPlayConfirmOpen(true);
            return;
        }

        if (key === "add") setAddOpen(true);
        if (key === "like") addSelectedToLiked();
    };

    if (loading) {
        return (
            <section className="whitespace-nowrap rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden p-10 text-[#f6f6f6]">
                차트 데이터를 불러오는 중...
            </section>
        );
    }

    if (errorMsg) {
        return (
            <section className="whitespace-nowrap rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden p-10 text-white">
                {errorMsg}
            </section>
        );
    }

    return (
        <section className="whitespace-nowrap rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                    {/* 상단 헤더 */}
                    <div className="px-8 py-6 border-b border-white/10">
                        <div className="flex pt-2 items-end justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <h2 className="text-3xl px-2 font-bold text-[#f6f6f6]">실시간 TOP 100 차트</h2>
                                <div className="text-base text-[#f6f6f6]/40 tracking-wider">
                                    {chart?.generatedAt ? formatGeneratedAt(chart.generatedAt) : ""}
                                </div>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="px-2 mt-4 flex flex-nowrap gap-3">
                            {actions.map((a) => {
                                const disabled = selectedCount === 0;
                                const needSel = a.key === "play" || a.key === "shuffle" || a.key === "add" || a.key === "like";

                                return (
                                    <button
                                        key={a.key}
                                        type="button"
                                        onClick={() => handleAction(a.key)}
                                        disabled={disabled && needSel}
                                        className={[
                                            "shrink-0 px-4 py-2 rounded-2xl border border-[#f6f6f6]/10",
                                            "text-base font-bold transition-all flex items-center gap-2.5",
                                            disabled && needSel
                                                ? "text-[#f6f6f6]/20 border-[#f6f6f6]/5 cursor-not-allowed"
                                                : "text-[#f6f6f6]/80 hover:bg-[#f6f6f6]/10 hover:text-[#f6f6f6] hover:border-[#f6f6f6]/20",
                                        ].join(" ")}
                                    >
                                        <span className="text-2xl">{a.icon}</span>
                                        <span className="whitespace-nowrap tracking-tight">{a.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 테이블 헤더 */}
                    <div>
                        <div className={`grid ${GRID} items-center justify-center py-3 px-4 text-base text-[#f6f6f6]/40`}>
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    className="accent-[#f6f6f6] cursor-pointer"
                                    checked={allChecked}
                                    onChange={(e) => toggleAll(e.target.checked)}
                                    aria-label="전체 선택"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="pl-2 whitespace-nowrap border-l border-white/10">순위</span>
                            </div>

                            <div className="pl-2 border-l border-white/10">곡정보</div>
                            <div className="pl-2 border-l border-white/10">아티스트</div>
                            <div className="pl-2 border-l border-white/10">앨범</div>
                        </div>

                        <div className="border-b border-white/10" />
                    </div>

                    {/* 리스트 */}
                    <div>
                        <div className="divide-y divide-white/10">
                            {rows.map((row) => (
                                <div
                                    key={row.musicId}
                                    className={`
                        group grid ${GRID} items-center px-4 py-2
                        transition-all duration-300 hover:bg-white/[0.08]
                        ${row.rank % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}
                    `}
                                >
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="accent-[#f6f6f6] cursor-pointer"
                                            checked={!!checkedIds[row.musicId]}
                                            onChange={() => toggleOne(row.musicId)}
                                            aria-label={`${row.rank}위 선택`}
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 flex items-center justify-center">
                                            <span className="ml-1 text-base font-bold text-[#f6f6f6]/90 transition-opacity group-hover:opacity-0 tabular-nums">
                                                {row.rank}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTrackAndPlay(toTrack(row));
                                                }}
                                                className="ml-1 absolute opacity-0 transition-all duration-300 group-hover:opacity-100 text-[#AFDEE2]"
                                                aria-label={`${row.musicName}재생`}
                                                title="재생"
                                            >
                                                <FaPlay />
                                            </button>
                                        </div>

                                        <div className="ml-1 text-sm font-semibold w-10">
                                            {(() => {
                                                const change = row.rankChange;
                                                if (change === null || change === 0) return <span className="ml-1 text-white/20">—</span>;
                                                if (change > 0) return <span className="text-red-400">▲{change}</span>;
                                                if (change < 0) return <span className="text-blue-400">▼{Math.abs(change)}</span>;
                                                return <span className="text-white/20">—</span>;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex pl-2 items-center gap-4 min-w-0">
                                        <div className="relative h-14 w-14 rounded-lg bg-white/10 shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                            {row.albumImage ? (
                                                <img
                                                    src={row.albumImage}
                                                    alt={row.albumName}
                                                    width={56}
                                                    height={56}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                                        if (fallback) fallback.style.display = "block";
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full bg-white/5 shrink-0 ${row.albumImage ? "hidden" : ""}`} />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="text-base font-semibold text-[#f6f6f6] truncate group-hover:text-[#AFDEE2] transition-colors">
                                                {row.musicName}
                                                {row.isAi && (
                                                    <span className="shrink-0 ml-3 text-xs font-black px-2.5 py-1 rounded-full bg-[#E4524D]/20 text-[#E4524D] border border-[#E4524D]/20 uppercase">
                                                        AI
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium text-white/40 truncate tracking-wide mt-1 md:hidden">
                                                {row.artistName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pl-2 text-base text-[#f6f6f6]/60 truncate group-hover:text-white/80 transition-colors">
                                        {row.artistName}
                                    </div>

                                    <div className="pl-2 text-base text-[#f6f6f6]/40 truncate group-hover:text-white/60 transition-colors">
                                        {row.albumName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
        </section>
    );
}
