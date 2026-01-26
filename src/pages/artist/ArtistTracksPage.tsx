// src/pages/artist/ArtistTracksPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { createPortal } from "react-dom";
import axios from "axios";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import {
    fetchArtistDetail,
    fetchArtistTracks,
    type ArtistDetail,
    type ArtistTrack,
} from "../../api/artist";

import { requireLogin } from "../../api/auth";

// ✅ SearchSong 담기 모달이 쓰는 실 API
import { listMyPlaylists, addPlaylistItem, type PlaylistSummary } from "../../api/playlist";
import { likeTrack } from "../../api/LikedSong";

/* ===================== 액션 ===================== */

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type ActionKey = (typeof actions)[number]["key"];

type TrackPlayApi = {
    music_id: number;
    music_name: string;
    artist_name: string;
    album_name: string;
    album_image: string | null;
    audio_url: string | null;
    duration: number | null; // seconds
    genre: string | null;
    is_ai: boolean;
    itunes_id: number;
};

function formatSeconds(sec: number | null): string {
    if (typeof sec !== "number" || Number.isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

// ✅ PlaylistDetailPage랑 동일하게 이미지 URL 정규화
function resolveImgUrl(API_BASE: string | undefined, src?: string | null) {
    if (!src) return null;
    if (src.startsWith("http") || src.startsWith("//")) return src;
    if (API_BASE && src.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${src}`;
    return src;
}

/* =====================
  Modal (Portal) - SearchSong과 동일
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

export default function ArtistTracksPage() {
    const { artistId } = useParams();
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
    
    const [artist, setArtist] = useState<ArtistDetail | null>(null);
    const [tracks, setTracks] = useState<ArtistTrack[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    // ✅ PlayerContext
    const { playTracks, enqueueTracks } = usePlayer();

    // ✅ 안전한 이름 (artist null 대비)
    const artistName = artist?.artist_name ?? "";

    const handlePlayById = async (musicId: string) => {
        try {
        if (!API_BASE) throw new Error("API_BASE가 없습니다.");
        setPlayingId(musicId);

        const res = await fetch(`${API_BASE}/tracks/${musicId}/play`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error(`트랙 재생 정보 조회 실패: ${res.status}`);
        }

        const data: TrackPlayApi = await res.json();

        if (!data.audio_url) {
            throw new Error("재생할 오디오 URL이 없습니다.");
        }

        const track: PlayerTrack = {
            id: String(data.music_id),
            musicId: data.music_id,
            title: data.music_name,
            artist: data.artist_name ?? artistName,
            album: data.album_name ?? "",
            duration: formatSeconds(data.duration),
            audioUrl: data.audio_url,
            coverUrl: resolveImgUrl(API_BASE, data.album_image) ?? undefined,
        };

        playTracks([track], { shuffle: false });
        } catch (e) {
        console.error("[ArtistTracksPage] play error:", e);
        alert(e instanceof Error ? e.message : "재생 중 오류가 발생했습니다.");
        } finally {
        setPlayingId(null);
        }
    };

    /* ===================== 체크박스 ===================== */

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);
    const someChecked = tracks.some((t) => checkedIds[t.id]) && !allChecked;

    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked;
    }, [someChecked]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const checkedTracks = useMemo(() => tracks.filter((t) => checkedIds[t.id]), [tracks, checkedIds]);
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

    /* ===================== 담기 모달 - ✅ 실데이터(SearchSong 패턴) ===================== */

    const [addOpen, setAddOpen] = useState(false);
    const [addTargets, setAddTargets] = useState<PlaylistSummary[]>([]);
    const [addTargetsLoading, setAddTargetsLoading] = useState(false);
    const [addTargetsError, setAddTargetsError] = useState<string | null>(null);

    useEffect(() => {
        if (!addOpen) return;

        let cancelled = false;

        (async () => {
        try {
            setAddTargetsLoading(true);
            setAddTargetsError(null);

            const data = await listMyPlaylists();
            if (cancelled) return;

            // ✅ 시스템 플리 제외 (SearchSong 동일)
            const filtered = data.filter((p) => p.visibility !== "system");
            setAddTargets(filtered);
        } catch (e) {
            console.error("[ArtistTracksPage] 플레이리스트 목록 불러오기 실패:", e);
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

    const fetchTrackAudioUrl = useCallback(
        async (musicId: string): Promise<string | undefined> => {
        if (!API_BASE) return undefined;
        try {
            const res = await axios.get<{ audio_url: string; album_image?: string | null }>(
            `${API_BASE}/tracks/${musicId}/play`,
            { headers: { "Content-Type": "application/json" } }
            );
            return res.data.audio_url ?? undefined;
        } catch (e) {
            console.error(`[ArtistTracksPage] 곡 ${musicId} 재생 URL 가져오기 실패:`, e);
            return undefined;
        }
        },
        [API_BASE]
    );

    const toPlayerTrack = useCallback(
        async (t: ArtistTrack): Promise<PlayerTrack> => {
        // ArtistTrack에 album_image 등이 없을 수 있어서 play API에서 커버/오디오를 확보
        const audioUrl = await fetchTrackAudioUrl(t.id);

        // coverUrl: 우선 ArtistTrack에 있으면 쓰고, 없으면 undefined
        const coverRaw =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t as any).album_image ??
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t as any).coverUrl ??
            null;

        return {
            id: t.id,
            musicId: Number(t.id),
            title: t.title,
            artist: artistName,
            album: t.album ?? "",
            duration: t.duration ?? "0:00",
            audioUrl,
            coverUrl: resolveImgUrl(API_BASE, coverRaw) ?? undefined,
        };
        },
        [API_BASE, artistName, fetchTrackAudioUrl]
    );

    const addSelectedToPlaylist = async (playlistId: string) => {
        if (selectedCount === 0) return;

        try {
        // ✅ ids는 number로 보내기 (SearchSong과 동일)
        const musicIds = checkedTracks
            .map((t) => Number(t.id))
            .filter((id) => Number.isFinite(id)) as number[];

        const unique = Array.from(new Set(musicIds));
        if (unique.length === 0) return;

        const results = await Promise.allSettled(
            unique.map(async (id) => {
            try {
                await addPlaylistItem(playlistId, id);
                return { id, ok: true };
            } catch (e) {
                if (axios.isAxiosError(e)) {
                const status = e.response?.status;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const msg = (e.response?.data as any)?.error || (e.response?.data as any)?.message || "";

                const isAlready =
                    status === 409 ||
                    (status === 400 && typeof msg === "string" && msg.includes("이미 플레이리스트에 추가된 곡"));

                if (isAlready) return { id, ok: true, already: true };
                }
                throw e;
            }
            })
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fulfilled = results
            .filter((r) => r.status === "fulfilled")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((r) => (r as PromiseFulfilledResult<any>).value);

        const already = fulfilled.filter((v) => v?.already).length;
        const ok = fulfilled.filter((v) => v?.ok && !v?.already).length;
        const fail = results.length - (ok + already);

        alert(
            fail === 0
            ? already > 0
                ? `담기 완료: ${ok}곡 / 이미 담김: ${already}곡`
                : `담기 완료: ${ok}곡`
            : `담기 완료: ${ok}곡 / 실패: ${fail}곡${already > 0 ? ` / 이미 담김: ${already}곡` : ""}`
        );

        setAddOpen(false);
        setCheckedIds({});
        } catch (e) {
        console.error("[ArtistTracksPage] 플레이리스트 담기 실패:", e);
        alert("플레이리스트에 담기 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    };

    const addSelectedToLiked = async () => {
        if (selectedCount === 0) return;

        try {
        const musicIds = checkedTracks
            .map((t) => Number(t.id))
            .filter((id) => Number.isFinite(id)) as number[];

        const unique = Array.from(new Set(musicIds));
        if (unique.length === 0) return;

        const results = await Promise.allSettled(
            unique.map(async (id) => {
            try {
                await likeTrack(id);
                return { id, ok: true };
            } catch (e) {
                if (axios.isAxiosError(e) && e.response?.status === 409) {
                return { id, ok: true, already: true };
                }
                throw e;
            }
            })
        );

        const ok = results.filter((r) => r.status === "fulfilled").length;
        const fail = results.length - ok;

        setCheckedIds({});

        if (fail === 0) alert(`좋아요 완료: ${ok}곡`);
        else alert(`좋아요 완료: ${ok}곡 / 실패: ${fail}곡`);
        } catch (e) {
        console.error("[ArtistTracksPage] 좋아요 실패:", e);
        alert("좋아요 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    };

    /* ===================== 액션 ===================== */

    const handleAction = async (key: ActionKey) => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (selectedCount === 0) return;

        if (key === "play" || key === "shuffle") {
        const playerTracks = await Promise.all(checkedTracks.map(toPlayerTrack));
        setPendingPlay({ key, tracks: playerTracks });
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

    /* ===================== 데이터 로드 ===================== */

    useEffect(() => {
        if (!artistId) {
        setError("아티스트 ID가 없습니다.");
        setArtist(null);
        setTracks([]);
        return;
        }

        const idNum = Number(artistId);
        if (Number.isNaN(idNum)) {
        setError("유효하지 않은 아티스트 ID입니다.");
        setArtist(null);
        setTracks([]);
        return;
        }

        let cancelled = false;

        (async () => {
        try {
            setLoading(true);
            setError(null);

            const [detail, list] = await Promise.all([fetchArtistDetail(idNum), fetchArtistTracks(idNum)]);

            if (cancelled) return;

            setArtist(detail);
            setTracks(list);
            setCheckedIds({});
        } catch (e: unknown) {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : "알 수 없는 오류");
            setArtist(null);
            setTracks([]);
        } finally {
            if (!cancelled) setLoading(false);
        }
        })();

        return () => {
        cancelled = true;
        };
    }, [artistId]);

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

    if (!artist || error) {
        return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
            <button type="button" onClick={() => navigate(-1)} className="mb-6 text-[#aaa] hover:text-white transition">
            <IoChevronBack size={24} />
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xl font-semibold">아티스트를 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{artistId ?? "(없음)"}</span>
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
                <h1 className="text-xl font-semibold text-[#F6F6F6]">{artist.artist_name} · 전체 곡</h1>
            </div>
            </div>

            <section className="mt-4 mx-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden">
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

            <div className="px-4 pt-4 border-b border-white/10">
                <div
                className={[
                    "px-4 grid items-center",
                    "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
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
                <div className="hidden min-[1200px]:block px-2 border-l border-white/10">앨범</div>
                <div className="text-right px-2 border-r border-white/10">길이</div>
                </div>
            </div>

            <div className="divide-y divide-white/10">
                {tracks.length === 0 ? (
                <div className="px-6 py-10 text-center text-base text-white/20">곡이 없습니다.</div>
                ) : (
                tracks.map((t) => {
                    const cover = resolveImgUrl(
                    API_BASE,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (t as any).album_image ?? null
                    );

                    return (
                    <div
                        key={t.id}
                        className={[
                        "grid items-center",
                        "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
                        "gap-x-3 px-8 py-2 hover:bg-white/5 transition cursor-pointer group",
                        ].join(" ")}
                        onDoubleClick={(e) => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        e.preventDefault();
                        if (playingId) return;
                        void handlePlayById(t.id);
                        }}
                    >
                        <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={!!checkedIds[t.id]}
                        onChange={() => toggleOne(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${t.title} 선택`}
                        />

                        <div className="ml-2 w-12 h-12 rounded-xl bg-white/5 overflow-hidden relative flex-shrink-0 shadow-lg">
                        {cover ? (
                            <img
                            src={cover}
                            alt={t.title}
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
                            {t.title}
                        </div>
                        <div className="ml-1 text-sm text-white/30 truncate">{artist.artist_name}</div>
                        </div>

                        <div className="hidden min-[1200px]:block ml-1 text-base text-white/50 truncate">{t.album}</div>

                        <div className="mr-1 text-base text-white/70 text-right tabular-nums group-hover:text-[#AFDEE2]/70 transition-colors">
                        {t.duration}
                        </div>
                    </div>
                    );
                })
                )}
            </div>
            </section>
        </div>

        {/* ✅ 담기 모달 (실데이터) */}
        <BaseModal open={addOpen} onClose={() => setAddOpen(false)} title="플레이리스트 선택" maxWidthClass="max-w-[420px]">
            <div className="px-6 py-4 text-base text-[#F6F6F6]/70">
            선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
            </div>

            <div className="max-h-[360px] overflow-y-auto border-t border-white/10">
            {addTargetsLoading ? (
                <div className="px-6 py-6 text-base text-[#aaa]">플레이리스트 불러오는 중...</div>
            ) : addTargetsError ? (
                <div className="px-6 py-6 text-base text-red-400">오류: {addTargetsError}</div>
            ) : addTargets.length === 0 ? (
                <div className="px-6 py-6 text-base text-[#aaa]">담을 수 있는 플레이리스트가 없어요.</div>
            ) : (
                addTargets.map((p) => (
                <button
                    key={p.playlist_id}
                    type="button"
                    onClick={() => addSelectedToPlaylist(String(p.playlist_id))}
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
            <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition"
            >
                취소
            </button>
            </div>
        </BaseModal>

        {/* ✅ 재생 방식 선택 모달 */}
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
                    <div className="mt-1 text-xs text-[#999]">지금 재생 대기목록을 초기화하고 선택한 곡들로 새로 재생합니다.</div>
                </button>

                <button
                    type="button"
                    onClick={() => runPendingPlay("enqueue")}
                    className="w-full px-4 py-3 rounded-2xl text-base text-[#F6F6F6] outline outline-1 outline-white/10 hover:bg-white/10 transition text-left"
                >
                    <div className="font-semibold text-[#afdee2]">재생 대기목록 맨 뒤에 추가</div>
                    <div className="mt-1 text-xs text-[#999]">현재 재생은 유지하고, 선택한 곡들을 재생 대기 목록 마지막에 둡니다.</div>
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
