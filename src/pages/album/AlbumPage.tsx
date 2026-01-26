// AlbumDetailPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { createPortal } from "react-dom";

import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";

import { ARTISTS } from "../../mocks/artistsMock";

import { likeAlbum, unlikeAlbum, listLikedAlbums } from "../../api/album";
import { listMyPlaylists, addPlaylistItem, type PlaylistSummary } from "../../api/playlist";
import { likeTrack } from "../../api/LikedSong";

/* =====================
  Types
===================== */

type Track = {
  id: string;
  title: string;
  album: string;
  duration: string; // "mm:ss"
  albumImage?: string | null;
};
type Album = { id: string; title: string; year: string; albumImage?: string | null };
type ArtistData = { id: string; name: string; tracks: Track[]; albums: Album[] };
type Found = { artist: ArtistData; album: Album; tracks: Track[] } | null;

// 백엔드 앨범 상세 API 응답 타입 (필요한 필드만 정의)
type ApiAlbumDetail = {
  album_id: number;
  album_name: string;
  album_image: string | null;
  image_large_square: string | null; // ✅ RDS에 저장된 이미지 (우선 사용)
  artist: {
    artist_id: number;
    artist_name: string;
  };
  track_count: number;
  total_duration: number;
  total_duration_formatted: string;
  like_count: number;
  is_liked?: boolean;
  tracks: {
    music_id: number;
    music_name: string;
    artist_name: string | null;
    duration: string; // "mm:ss"
    duration_seconds: number | null;
    is_ai: boolean;
  }[];
  created_at: string;
  updated_at: string;
};

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type PendingPlay = {
    key: "play" | "shuffle";
    tracks: PlayerTrack[];
};

/* =====================
    Utils
===================== */

const toSeconds = (duration: string) => {
    const [m, s] = duration.split(":").map((v) => Number(v));
    if (!Number.isFinite(m) || !Number.isFinite(s)) return 0;
    return m * 60 + s;
};

const formatTotal = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
};

// ✅ PlaylistDetailPage랑 동일하게 이미지 URL 정규화
function resolveImgUrl(API_BASE: string | undefined, src?: string | null) {
    if (!src) return null;
    if (src.startsWith("http") || src.startsWith("//")) return src;
    if (API_BASE && src.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${src}`;
    return src;
}

function findAlbumById(albumId: string | undefined): Found {
    const id = albumId ?? "";
    const entries = Object.values(ARTISTS) as ArtistData[];

    for (const artist of entries) {
        const album = artist.albums.find((a) => a.id === id);
        if (!album) continue;

        const tracks = artist.tracks.filter((t) => t.album === album.title);
        return { artist, album, tracks };
    }
    return null;
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

/* =====================
    Component
===================== */

export default function AlbumDetailPage() {
    const { albumId } = useParams();
    const { playTracks, enqueueTracks } = usePlayer();
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

    // API로 가져온 앨범 데이터 (있으면 우선 사용)
    const [apiFound, setApiFound] = useState<Found>(null);
    const [apiAlbum, setApiAlbum] = useState<ApiAlbumDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 더미 fallback
    const found = useMemo(() => findAlbumById(albumId), [albumId]);

    // ✅ 체크 상태
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

    // ✅ 앨범 좋아요 상태
    const [albumLiked, setAlbumLiked] = useState(false);
    const [albumLikeCount, setAlbumLikeCount] = useState(0);

    // ✅ 모달 상태
    const [addOpen, setAddOpen] = useState(false);
    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    // ✅ 담기 대상(실제 API)
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

            const filtered = data.filter((p) => p.visibility !== "system");
            setAddTargets(filtered);
        } catch (e) {
            console.error("[AlbumDetailPage] 플레이리스트 목록 불러오기 실패:", e);
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

    // 곡 이미지 상태 (트랙별 이미지 저장)
    const [trackImages, setTrackImages] = useState<Record<string, string>>({});

    // (옵션) artist tracks api 호출 최신성 관리
    const artistTracksRunIdRef = useRef(0);

    // 앨범 상세 API 호출
    useEffect(() => {
        // API 미설정이거나, 숫자가 아닌 더미 ID(a1-al1 등)는 기존 더미 데이터 사용
        if (!API_BASE || !albumId || Number.isNaN(Number(albumId))) {
        setApiFound(null);
        setApiAlbum(null);
        setError(null);
        return;
        }

        const controller = new AbortController();

        (async () => {
        try {
            setLoading(true);
            setError(null);

            const albumIdNum = Number(albumId);
            const res = await fetch(`${API_BASE}/albums/${albumIdNum}/`, {
            method: "GET",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) throw new Error(`앨범 상세 조회 실패: ${res.status}`);

            const data: ApiAlbumDetail = await res.json();
            setApiAlbum(data);

            // API 응답을 기존 Found 구조로 변환
            const artist: ArtistData = {
            id: String(data.artist.artist_id),
            name: data.artist.artist_name,
            tracks: [],
            albums: [],
            };

            const year = data.created_at && data.created_at.length >= 4 ? data.created_at.slice(0, 4) : "";
            const albumImage = data.image_large_square || data.album_image;

            const album: Album = {
            id: String(data.album_id),
            title: data.album_name,
            year,
            albumImage,
            };

            const tracks: Track[] = data.tracks.map((t) => ({
            id: String(t.music_id), // ✅ music_id를 id로 사용
            title: t.music_name,
            album: data.album_name,
            duration: t.duration || "0:00",
            }));

            setApiFound({ artist, album, tracks });
        } catch (e: unknown) {
            if ((e as DOMException)?.name === "AbortError") return;
            console.error("[AlbumDetailPage] 앨범 상세 API 오류:", e);
            setError(e instanceof Error ? e.message : "알 수 없는 오류");
            setApiFound(null);
            setApiAlbum(null);
        } finally {
            setLoading(false);
        }
        })();

        return () => controller.abort();
    }, [API_BASE, albumId]);

    const effective = apiFound ?? found;

    // 앨범 데이터 로드 시 좋아요 상태 업데이트
    useEffect(() => {
        if (!apiAlbum) return;

        (async () => {
        try {
            const likedAlbums = await listLikedAlbums();
            const likedAlbum = likedAlbums.find((a) => a.album_id === apiAlbum.album_id);

            if (likedAlbum) {
            setAlbumLiked(true);
            setAlbumLikeCount(likedAlbum.like_count);
            } else {
            setAlbumLiked(apiAlbum.is_liked ?? false);
            setAlbumLikeCount(apiAlbum.like_count);
            }
        } catch (e) {
            console.error("[AlbumPage] 좋아요 상태 확인 실패:", e);
            setAlbumLiked(apiAlbum.is_liked ?? false);
            setAlbumLikeCount(apiAlbum.like_count);
        }
        })();
    }, [apiAlbum]);

    // 곡 이미지 가져오기 (아티스트 트랙 API 사용)
    useEffect(() => {
        if (!API_BASE || !effective?.artist?.id || Number.isNaN(Number(effective.artist.id))) return;

        const runId = ++artistTracksRunIdRef.current;
        const controller = new AbortController();

        (async () => {
        try {
            const artistIdNum = Number(effective.artist.id);
            const res = await axios.get<
            Array<{
                music_id: number;
                music_name: string;
                album_image: string | null;
            }>
            >(`${API_BASE}/artists/${artistIdNum}/tracks/`, {
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            });

            if (runId !== artistTracksRunIdRef.current) return;

            const images: Record<string, string> = {};
            res.data.forEach((track) => {
            if (track.album_image) images[String(track.music_id)] = track.album_image;
            });

            setTrackImages(images);
        } catch (e) {
            if (axios.isCancel(e)) return;
            console.error("[AlbumPage] 곡 이미지 가져오기 실패:", e);
        }
        })();

        return () => controller.abort();
    }, [API_BASE, effective?.artist?.id]);

    const fetchTrackAudioUrl = useCallback(
        async (musicId: string): Promise<string | undefined> => {
        if (!API_BASE) return undefined;
        try {
            const res = await axios.get<{ audio_url: string }>(`${API_BASE}/tracks/${musicId}/play`, {
            headers: { "Content-Type": "application/json" },
            });
            return res.data.audio_url;
        } catch (e) {
            console.error(`[AlbumPage] 곡 ${musicId} 재생 URL 가져오기 실패:`, e);
            return undefined;
        }
        },
        [API_BASE]
    );

    const toPlayerTrack = useCallback(
        async (t: Track): Promise<PlayerTrack> => {
        const albumNumericId = effective?.album ? Number(effective.album.id) : NaN;

        if (!effective?.artist) {
            return {
            id: t.id,
            title: t.title,
            artist: "Unknown",
            album: t.album,
            duration: t.duration,
            audioUrl: undefined,
            coverUrl: undefined,
            albumId: Number.isFinite(albumNumericId) ? albumNumericId : null,
            musicId: Number.isFinite(Number(t.id)) ? Number(t.id) : undefined,
            };
        }

        const audioUrl = await fetchTrackAudioUrl(t.id);

        const coverRaw = trackImages[t.id] || effective.album?.albumImage || null;
        const coverUrl = resolveImgUrl(API_BASE, coverRaw) ?? undefined;

        return {
            id: t.id,
            title: t.title,
            artist: effective.artist.name || "Unknown",
            album: t.album,
            duration: t.duration,
            audioUrl: audioUrl || undefined,
            coverUrl,
            albumId: Number.isFinite(albumNumericId) ? albumNumericId : null,
            musicId: Number.isFinite(Number(t.id)) ? Number(t.id) : undefined,
        };
        },
        [API_BASE, effective, fetchTrackAudioUrl, trackImages]
    );

    const runPendingPlay = (mode: "replace" | "enqueue") => {
        if (!pendingPlay) return;
        const isShuffle = pendingPlay.key === "shuffle";

        if (mode === "replace") playTracks(pendingPlay.tracks, { shuffle: isShuffle });
        else enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });

        setCheckedIds({});
        setPendingPlay(null);
        setPlayConfirmOpen(false);
    };

    // ✅ 로딩/에러
    if (loading && !effective) {
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center py-10">
            <div className="text-lg text-[#ccc]">앨범 정보를 불러오는 중...</div>
            </div>
        </div>
        );
    }

    if (!effective) {
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
            <div className="text-xl font-semibold">앨범을 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{albumId ?? "(없음)"}</span>
            </div>
            {error && <div className="mt-2 text-sm text-red-400">오류: {error}</div>}
            </div>
        </div>
        );
    }

    const { artist, album } = effective;

    const tracks = effective?.tracks ?? [];
    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds(t.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);
    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };
    const toggleOne = (id: string) => setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));

    const selectedTracks = tracks.filter((t) => !!checkedIds[t.id]);
    const selectedCount = selectedTracks.length;

    // ✅ 선택한 곡을 특정 플레이리스트에 추가 (실제 API)
    const addSelectedToPlaylist = async (playlistId: string) => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (selectedCount === 0) return;

        try {
        // Track.id === music_id (문자열) 가정
        const musicIds = selectedTracks
            .map((t) => Number(t.id))
            .filter((id): id is number => Number.isFinite(id));

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
        console.error("[AlbumDetailPage] 플레이리스트 담기 실패:", e);
        alert("플레이리스트에 담기 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    };

    // ✅ 액션바 좋아요: 선택곡 좋아요(실제 API)
    const addSelectedToLiked = async () => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (selectedCount === 0) return;

        try {
        const musicIds = selectedTracks
            .map((t) => Number(t.id))
            .filter((id): id is number => Number.isFinite(id));

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
        console.error("[AlbumDetailPage] 좋아요 실패:", e);
        alert("좋아요 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    };

    const resolvedAlbumImage = resolveImgUrl(API_BASE, album.albumImage ?? null) ?? undefined;

    return (
        <div className="w-full min-w-0 overflow-x-auto">
        {/* 상단 */}
        <section className="relative overflow-visible">
            <div className="relative h-72 bg-[#4d4d4d]/50 border-b border-[#3D3D3D] overflow-hidden">
            {resolvedAlbumImage && (
                <img
                src={resolvedAlbumImage}
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

            <div className="absolute inset-0 flex items-end">
                <div className="px-10 pb-8 flex items-end gap-8 min-w-[1100px] shrink-0">
                <div className="w-[228px] h-[228px] shrink-0" />

                <div className="flex items-end gap-5">
                    <div className="min-w-0">
                    {/* ✅ 헤더 좋아요 = 앨범 좋아요 토글 */}
                    <button
                        type="button"
                        onClick={async () => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        if (!apiAlbum) return;

                        const wasLiked = albumLiked;
                        setAlbumLiked(!wasLiked);
                        setAlbumLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

                        try {
                            if (wasLiked) {
                            const response = await unlikeAlbum(apiAlbum.album_id);
                            setAlbumLikeCount(response.like_count);
                            } else {
                            const response = await likeAlbum(apiAlbum.album_id);
                            setAlbumLikeCount(response.like_count);
                            }
                        } catch (e) {
                            console.error("앨범 좋아요 토글 실패:", e);
                            setAlbumLiked(wasLiked);
                            setAlbumLikeCount(apiAlbum.like_count);
                        }
                        }}
                        className={[
                        "h-11 rounded-2xl flex items-center gap-2 transition",
                        albumLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                        ].join(" ")}
                        aria-label="앨범 좋아요"
                        title="앨범 좋아요"
                    >
                        <MdFavorite size={22} className={albumLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"} />
                        <span className="text-sm tabular-nums">{albumLikeCount.toLocaleString()}</span>
                    </button>

                    <div className="text-4xl font-semibold text-[#F6F6F6] leading-none truncate">{album.title}</div>

                    <div className="mt-2 text-base text-[#F6F6F6]/60 truncate">
                        {artist.name} · {tracks.length}곡 · {totalPlaytime}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={async () => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        if (tracks.length === 0) return;
                        const playerTracks = await Promise.all(tracks.map(toPlayerTrack));
                        playTracks(playerTracks);
                    }}
                    className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                    aria-label="앨범 재생"
                    title="재생"
                    >
                    <FaPlay size={16} />
                    </button>
                </div>
                </div>
            </div>
            </div>

            {/* 앨범 이미지 */}
            <div
            className="
                absolute left-10 top-28
                w-[228px] h-[228px]
                rounded-3xl overflow-hidden
                z-20 shadow-xl
                pointer-events-none
                bg-[#6b6b6b]/40
            "
            >
            {resolvedAlbumImage ? (
                <img
                src={resolvedAlbumImage}
                alt={album.title}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
                onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                />
            ) : (
                <div className="w-full h-full bg-[#6b6b6b]/40" />
            )}
            </div>
        </section>

        {/* 본문 */}
        <div className="mt-[70px] px-4 space-y-6">
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
                {actions.map((a) => {
                    const disabled =
                    (a.key === "play" || a.key === "shuffle" || a.key === "add" || a.key === "like") &&
                    selectedCount === 0;

                    const onClick = async () => {
                    if (!requireLogin("로그인 후 이용 가능합니다.")) return;

                    if (a.key === "like") {
                        if (selectedCount === 0) return;
                        await addSelectedToLiked();
                        return;
                    }

                    if (a.key === "add") {
                        if (selectedCount === 0) return;
                        setAddOpen(true);
                        return;
                    }

                    if (a.key === "play" || a.key === "shuffle") {
                        if (selectedCount === 0) return;
                        const playerTracks = await Promise.all(selectedTracks.map(toPlayerTrack));
                        setPendingPlay({ key: a.key, tracks: playerTracks });
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
                    const coverRaw = trackImages[t.id] || album.albumImage || null;
                    const cover = resolveImgUrl(API_BASE, coverRaw);

                    return (
                    <div
                        key={t.id}
                        className={[
                        "grid items-center",
                        "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
                        "gap-x-3 px-8 py-2 hover:bg-white/5 transition cursor-pointer group",
                        ].join(" ")}
                        onDoubleClick={async (e) => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        e.preventDefault();
                        try {
                            const one = await toPlayerTrack(t);
                            if (!one.audioUrl) return;
                            playTracks([one], { shuffle: false });
                        } catch (err) {
                            console.error("[AlbumPage] 더블클릭 재생 오류:", err);
                        }
                        }}
                    >
                        <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={!!checkedIds[t.id]}
                        onChange={() => toggleOne(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${t.title ?? "곡"} 선택`}
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
                                (e.currentTarget as HTMLImageElement).style.display = "none";
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
                        <div className="ml-1 text-sm text-white/30 truncate">{artist.name}</div>
                        </div>

                        <div className="hidden min-[1200px]:block ml-1 text-base text-white/50 truncate">{album.title}</div>

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

        {/* ✅ 담기 모달 (실제 API) */}
        <BaseModal open={addOpen} onClose={() => setAddOpen(false)} title="플레이리스트 선택" maxWidthClass="max-w-[420px]">
            <div className="px-6 py-4 text-base text-[#F6F6F6]/70">선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요</div>

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
                    onClick={() => addSelectedToPlaylist(p.playlist_id.toString())}
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
        </div>
    );
}
