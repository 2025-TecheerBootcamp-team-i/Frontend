import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import axios from "axios";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";


import { ARTISTS } from "../../mocks/artistsMock";

import {
    getPlaylistById,
    updatePlaylist,
    subscribePlaylists,
    LIKED_SYSTEM_ID,
    getUserPlaylists,
    isAlbumLiked,
    getAlbumLikeCount,
    toggleAlbumLike,
} from "../../mocks/playlistMock";

type Track = { id: string; title: string; album: string; duration: string; albumImage?: string | null };
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
    // ✅ 액션바 like = 선택곡을 "나의 좋아요 플리"에 담기
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

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

export default function AlbumDetailPage() {
    const { albumId } = useParams();
    const { playTracks, enqueueTracks } = usePlayer();
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

    // API로 가져온 앨범 데이터 (있으면 우선 사용)
    const [apiFound, setApiFound] = useState<Found>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const found = useMemo(() => findAlbumById(albumId), [albumId]);

    // 앨범 상세 API 호출
    useEffect(() => {
        // API 미설정이거나, 숫자가 아닌 더미 ID(a1-al1 등)는 기존 더미 데이터 사용
        if (!API_BASE || !albumId || Number.isNaN(Number(albumId))) {
            setApiFound(null);
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

                if (!res.ok) {
                    throw new Error(`앨범 상세 조회 실패: ${res.status}`);
                }

                const data: ApiAlbumDetail = await res.json();

                // API 응답을 기존 Found 구조로 변환
                const artist: ArtistData = {
                    id: String(data.artist.artist_id),
                    name: data.artist.artist_name,
                    tracks: [],
                    albums: [],
                };

                const year =
                    data.created_at && data.created_at.length >= 4
                        ? data.created_at.slice(0, 4)
                        : "";

                // ✅ image_large_square 우선 사용 (RDS에 저장된 이미지), 없으면 album_image 사용
                const albumImage = data.image_large_square || data.album_image;
                
                const album: Album = {
                    id: String(data.album_id),
                    title: data.album_name,
                    year,
                    albumImage: albumImage,
                };

                // 🔍 앨범 이미지 출처 추적 로깅
                if (albumImage) {
                    const isExternal = albumImage.startsWith("http://") || 
                                      albumImage.startsWith("https://") || 
                                      albumImage.startsWith("//");
                    const isRdsPath = albumImage.startsWith("/");
                    
                    console.log(`[AlbumPage] 📸 앨범 이미지 출처 추적:`, {
                        album_id: data.album_id,
                        album_name: data.album_name,
                        image_large_square: data.image_large_square,
                        album_image: data.album_image,
                        final_image_url: albumImage,
                        source_type: isExternal ? "외부 URL (iTunes/YouTube 등)" : isRdsPath ? "RDS 경로" : "기타",
                        is_external: isExternal,
                        is_rds_path: isRdsPath,
                        using_image_large_square: !!data.image_large_square,
                    });
                    
                    // "SUPER REAL ME (Sped Up) - EP" 특별 추적
                    if (data.album_name?.includes("SUPER REAL ME")) {
                        console.warn(`[AlbumPage] ⚠️ "SUPER REAL ME" 앨범 이미지 발견:`, {
                            album_id: data.album_id,
                            album_name: data.album_name,
                            image_large_square: data.image_large_square,
                            album_image: data.album_image,
                            final_image_url: albumImage,
                            source: isExternal ? "외부 API에서 가져온 것으로 추정" : "RDS 경로",
                            using_image_large_square: !!data.image_large_square,
                        });
                    }
                }

                const tracks: Track[] = data.tracks.map((t) => ({
                    id: String(t.music_id),
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
            } finally {
                setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [API_BASE, albumId]);

    const effective = apiFound ?? found;

    // ✅ found가 null이어도 hooks는 항상 같은 순서
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

    // ✅ 앨범 좋아요 초기 카운트(없으면 fallback으로 사용)
    const INITIAL_LIKE_COUNT = 0;

    // ✅ 앨범 좋아요/카운트 store (playlistMock)
    const [albumLiked, setAlbumLiked] = useState(() =>
        albumId ? isAlbumLiked(albumId) : false
    );

    const [albumLikeCount, setAlbumLikeCount] = useState(() =>
        albumId ? getAlbumLikeCount(albumId, INITIAL_LIKE_COUNT) : INITIAL_LIKE_COUNT
    );

    useEffect(() => {
        if (!albumId) return;

        const sync = () => {
        setAlbumLiked(isAlbumLiked(albumId));
        setAlbumLikeCount(getAlbumLikeCount(albumId, INITIAL_LIKE_COUNT));
        };

        sync();
        return subscribePlaylists(sync); // ✅ albumLike도 emit()이므로 playlist 구독으로 충분
    }, [albumId]);

    const tracks = effective?.tracks ?? [];
    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds(t.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // ✅ 담기 모달 (⚠️ if (!found) return 보다 위에 있어야 함)
    const [addOpen, setAddOpen] = useState(false);

    type PendingPlay = {
        key: "play" | "shuffle";     // 여기 페이지에서는 이 둘만 쓰면 됨
        tracks: PlayerTrack[];
    };

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


    // ✅ 담기 대상(유저 플리만) - 구독 emit에 맞춰 목록도 동기화
    const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

    useEffect(() => {
        const syncTargets = () => setAddTargets(getUserPlaylists());
        syncTargets();
        return subscribePlaylists(syncTargets);
    }, []);

    // 곡 이미지 상태 (트랙별 이미지 저장)
    const [trackImages, setTrackImages] = useState<Record<string, string>>({});

    // 곡 이미지 가져오기 (아티스트 트랙 API 사용)
    useEffect(() => {
        if (!API_BASE || !effective?.artist?.id || Number.isNaN(Number(effective.artist.id))) {
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                const artistIdNum = Number(effective.artist.id);
                const res = await axios.get<Array<{
                    music_id: number;
                    music_name: string;
                    album_image: string | null;
                }>>(`${API_BASE}/artists/${artistIdNum}/tracks/`, {
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                // 트랙 ID를 키로 하는 이미지 맵 생성
                const images: Record<string, string> = {};
                res.data.forEach((track) => {
                    if (track.album_image) {
                        images[String(track.music_id)] = track.album_image;
                    }
                });

                setTrackImages(images);
            } catch (e) {
                if (axios.isCancel(e)) return;
                console.error("[AlbumPage] 곡 이미지 가져오기 실패:", e);
            }
        })();

        return () => controller.abort();
    }, [API_BASE, effective?.artist?.id]);

    // 곡의 오디오 URL 가져오기 - hooks는 조건부 반환 이전에 호출해야 함
    const fetchTrackAudioUrl = useCallback(async (musicId: string): Promise<string | undefined> => {
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
    }, [API_BASE]);

    const toPlayerTrack = useCallback(async (t: Track): Promise<PlayerTrack> => {
        // 앨범 ID 숫자 변환 (큰 커버 이미지를 위한 albumId 저장)
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
            };
        }

        const audioUrl = await fetchTrackAudioUrl(t.id);
        console.log(`[AlbumPage] 곡 ${t.id} (${t.title})의 오디오 URL:`, audioUrl || "(없음)");
        
        // 곡 이미지가 있으면 곡 이미지, 없으면 앨범 이미지 사용
        const coverUrl = trackImages[t.id] || effective.album?.albumImage || undefined;
        
        return {
            id: t.id,
            title: t.title,
            artist: effective.artist.name || "Unknown",
            album: t.album,
            duration: t.duration,
            audioUrl: audioUrl || undefined,
            coverUrl: coverUrl,
            albumId: Number.isFinite(albumNumericId) ? albumNumericId : null,
        };
    }, [effective, fetchTrackAudioUrl, trackImages]);

    // ✅ 로딩 중 & 아직 데이터가 없을 때
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
            {error && (
                <div className="mt-2 text-sm text-red-400">오류: {error}</div>
            )}
            </div>
        </div>
        );
    }

    const { artist, album } = effective;

    const selectedTracks = tracks.filter((t) => !!checkedIds[t.id]);
    const selectedCount = selectedTracks.length;

    // ✅ 선택한 곡을 특정 플레이리스트에 추가
    const addSelectedToPlaylist = async (playlistId: string) => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(playlistId);
        if (!curr) return;

        const checkedPlayerTracks = await Promise.all(selectedTracks.map(toPlayerTrack));
        const incoming = checkedPlayerTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album ?? "",
        duration: t.duration ?? "0:00",
        likeCount: 0,
        kind: "track" as const,
        }));

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

    // ✅ 액션바 좋아요: 선택곡을 "나의 좋아요 플리"에 추가
    const addSelectedToLiked = async () => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(LIKED_SYSTEM_ID);
        if (!curr) return;

        const checkedPlayerTracks = await Promise.all(selectedTracks.map(toPlayerTrack));
        const incoming = checkedPlayerTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album ?? "",
        duration: t.duration ?? "0:00",
        likeCount: 0,
        kind: "track" as const,
        }));

        const exists = new Set(curr.tracks.map((t) => t.id));
        const merged = [...curr.tracks];

        for (const tr of incoming) {
        if (exists.has(tr.id)) continue;
        merged.push(tr);
        exists.add(tr.id);
        }

        updatePlaylist(LIKED_SYSTEM_ID, { tracks: merged });
        setCheckedIds({});
    };

    return (
        <div className="w-full min-w-0 overflow-x-auto">
        {/* 상단 */}
        <section className="relative overflow-visible">
            <div className="relative h-72 bg-[#1D1D1D]/70 border-b border-[#3D3D3D]/80 overflow-hidden">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-4 top-5 z-10 p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
                title="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>

            <div className="absolute inset-0 flex items-end">
                <div className="px-12 pb-8 flex items-end gap-8 min-w-[1100px] shrink-0">
                <div className="w-[228px] h-[228px] shrink-0" /> {/* 플레이스홀더 */}

                <div className="flex items-end gap-5">
                    <div className="min-w-0">
                    {/* ✅ 헤더 좋아요 = "앨범 좋아요" 토글 (카드 생성 X) */}
                    <button
                        type="button"
                        onClick={() => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        if (!albumId) return;
                        toggleAlbumLike(albumId, INITIAL_LIKE_COUNT);
                        }}
                        className={[
                        "h-11 rounded-2xl",
                        "flex items-center gap-2",
                        "transition",
                        albumLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                        ].join(" ")}
                        aria-label="앨범 좋아요"
                        title="앨범 좋아요"
                    >   
                        <MdFavorite
                        size={22}
                        className={albumLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"}
                        />
                        <span className="text-sm tabular-nums">
                        {albumLikeCount.toLocaleString()}
                        </span>
                    </button>

                    <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none truncate">
                        {album.title}
                    </div>
                    <div className="mt-2 text-sm text-[#F6F6F6]/60 truncate">
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
            {album.albumImage && (
                <div className="absolute left-12 top-28 w-[228px] h-[228px] rounded-3xl overflow-hidden z-20 shadow-xl">
                    <img
                        src={
                            album.albumImage.startsWith("http") || album.albumImage.startsWith("//")
                                ? album.albumImage
                                : API_BASE
                                ? `${API_BASE.replace("/api/v1", "")}${album.albumImage}`
                                : album.albumImage
                        }
                        alt={album.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                </div>
            )}
            {!album.albumImage && (
                <div className="absolute left-12 top-28 w-[228px] h-[228px] rounded-3xl bg-[#777777] z-20 shadow-xl" />
            )}
        </section>

        {/* 본문 */}
        <div className="mt-[70px] px-4 space-y-6">
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#464646]">
                <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-semibold text-[#F6F6F6]">곡 전체보기</h2>
                    <div className="text-sm text-[#999999]">총 {tracks.length}곡</div>
                </div>
                </div>

                <div className="mt-4 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar">
                {actions.map((a) => {
                    const disabled =
                    (a.key === "play" ||
                        a.key === "shuffle" ||
                        a.key === "like" ||
                        a.key === "add") &&
                    selectedCount === 0;

                    const onClick = async () => {
                    if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                    if (a.key === "like") {
                        await addSelectedToLiked();
                        return;
                    }
                    if (a.key === "play" || a.key === "shuffle") {
                        if (selectedCount === 0) return;

                        const playerTracks = await Promise.all(selectedTracks.map(toPlayerTrack));
                        setPendingPlay({ key: a.key, tracks: playerTracks });
                        setPlayConfirmOpen(true);
                        return;
                    }
                    if (a.key === "add") {
                        if (selectedCount === 0) return;
                        setAddOpen(true);
                        return;
                    }
                    };

                    return (
                    <button
                        key={a.key}
                        type="button"
                        onClick={onClick}
                        disabled={disabled}
                        className={[
                        "shrink-0 px-4 py-2 rounded-2xl",
                        "outline outline-1 outline-offset-[-1px] outline-stone-500",
                        "text-sm transition flex items-center gap-2",
                        disabled
                            ? "text-white/30 cursor-not-allowed"
                            : "text-[#F6F6F6] hover:bg-[#f6f6f6]/10",
                        ].join(" ")}
                    >
                        <span className="text-lg">{a.icon}</span>
                        <span className="whitespace-nowrap">{a.label}</span>
                    </button>
                    );
                })}
                </div>
            </div>

            <div className="px-6 pt-4">
                <div className="grid items-center grid-cols-[28px_56px_1fr_90px] gap-x-4 pb-3 text-xs text-[#F6F6F6]/60">
                <input
                    type="checkbox"
                    className="accent-[#f6f6f6]"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                />
                <div className="col-span-2 border-l px-2 border-[#464646]">곡정보</div>
                <div className="text-right border-r px-2 border-[#464646]">길이</div>
                </div>
            </div>

            <div className="border-b border-[#464646]" />

            <div className="pb-6">
                {tracks.map((t) => (
                <div
                    key={t.id}
                    className={[
                    "w-full text-left",
                    "grid grid-cols-[28px_42px_1fr_90px] items-center",
                    "gap-x-6",
                    "py-2 px-6",
                    "border-b border-[#464646]",
                    "hover:bg-white/5 transition",
                    ].join(" ")}
                    onDoubleClick={async () => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        try {
                            const track = await toPlayerTrack(t);
                            if (!track.audioUrl) {
                                console.warn("[AlbumPage] 더블클릭한 곡의 audioUrl 이 없습니다. 재생 불가:", {
                                    trackId: t.id,
                                    title: t.title,
                                });
                                return;
                            }
                            playTracks([track]);
                        } catch (e) {
                            console.error("[AlbumPage] 행 더블클릭 재생 중 오류:", e);
                        }
                    }}
                >
                    <div
                    className="flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={!!checkedIds[t.id]}
                        onChange={() => toggleOne(t.id)}
                        aria-label={`${t.title} 선택`}
                        onClick={(e) => e.stopPropagation()}
                    />
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-[#6b6b6b]/50 overflow-hidden relative">
                        {(trackImages[t.id] || album.albumImage) ? (
                            <img
                                src={
                                    (() => {
                                        const imageUrl = trackImages[t.id] || album.albumImage || "";
                                        if (imageUrl.startsWith("http") || imageUrl.startsWith("//")) {
                                            return imageUrl;
                                        }
                                        if (API_BASE && imageUrl.startsWith("/")) {
                                            return `${API_BASE.replace("/api/v1", "")}${imageUrl}`;
                                        }
                                        return imageUrl;
                                    })()
                                }
                                alt={t.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-[#6b6b6b]/50" />
                        )}
                    </div>

                    <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                        {t.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">{artist.name}</div>
                    </div>

                    <div className="text-sm text-[#F6F6F6]/70 text-right tabular-nums">
                    {t.duration}
                    </div>
                </div>
                ))}
            </div>
            </section>
        </div>

        {/* ✅ 담기 모달 */}
        {addOpen && (
            <div className="fixed inset-0 z-[999]">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setAddOpen(false)}
                aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                    <div className="text-base font-semibold text-[#F6F6F6]">
                    플레이리스트 선택
                    </div>
                    <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                    >
                    ✕
                    </button>
                </div>

                <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">
                    선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
                </div>

                <div className="max-h-[360px] overflow-y-auto border-t border-[#464646]">
                    {addTargets.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-[#aaa]">
                        담을 수 있는 플레이리스트가 없어요.
                        <div className="mt-2 text-xs text-[#777]">
                        (liked 같은 시스템 플리는 제외됨)
                        </div>
                    </div>
                    ) : (
                    addTargets.map((p) => (
                        <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                            if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                            addSelectedToPlaylist(p.id)}
                        }
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                        >
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                            {p.title}
                        </div>
                        <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                            {p.owner} · {p.isPublic ? "공개" : "비공개"}
                        </div>
                        </button>
                    ))
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                    <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="px-4 py-2 rounded-2xl text-sm text-[#F6F6F6] hover:bg-white/10 transition"
                    >
                    취소
                    </button>
                </div>
                </div>
            </div>
            </div>
        )}
        {/* ✅ 재생 방식 선택 모달 */}
        {playConfirmOpen && pendingPlay && (
        <div className="fixed inset-0 z-[999] whitespace-normal">
            <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
                setPlayConfirmOpen(false);
                setPendingPlay(null);
            }}
            aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
            <div className="w-full max-w-[440px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                <div className="text-base font-semibold text-[#F6F6F6]">재생 방식 선택</div>
                <button
                    type="button"
                    onClick={() => {
                    setPlayConfirmOpen(false);
                    setPendingPlay(null);
                    }}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                >
                    ✕
                </button>
                </div>

                <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">
                선택한 {pendingPlay.tracks.length}곡을{" "}
                {pendingPlay.key === "shuffle" ? "셔플로 " : ""}
                어떻게 재생할까요?
                </div>

                <div className="px-6 pb-6 grid grid-cols-1 gap-3">
                <button
                    type="button"
                    onClick={() => runPendingPlay("replace")}
                    className="w-full px-4 py-3 rounded-2xl text-sm text-[#F6F6F6] outline outline-1 outline-[#464646] hover:bg-white/10 transition text-left"
                >
                    <div className="font-semibold text-[#afdee2]">현재 재생 대기목록 지우고 재생</div>
                    <div className="mt-1 text-xs text-[#999]">
                    지금 재생 대기목록을 초기화하고 선택한 곡들로 새로 재생합니다.
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => runPendingPlay("enqueue")}
                    className="w-full px-4 py-3 rounded-2xl text-sm text-[#F6F6F6] outline outline-1 outline-[#464646] hover:bg-white/10 transition text-left"
                >
                    <div className="font-semibold text-[#afdee2]">재생 대기목록 맨 뒤에 추가</div>
                    <div className="mt-1 text-xs text-[#999]">
                    현재 재생은 유지하고, 선택한 곡들을 재생 대기 목록 마지막에 둡니다.
                    </div>
                </button>
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                    setPlayConfirmOpen(false);
                    setPendingPlay(null);
                    }}
                    className="px-4 py-2 rounded-2xl text-sm text-[#F6F6F6] hover:bg-white/10 transition"
                >
                    취소
                </button>
                </div>
            </div>
            </div>
        </div>
        )}

        </div>
    );
}
