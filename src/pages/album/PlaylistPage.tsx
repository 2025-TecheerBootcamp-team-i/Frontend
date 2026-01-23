import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPlaylistDetail,
    likePlaylist,
    unlikePlaylist,
    deletePlaylistItems,
    type PlaylistDetail,
    type PlaylistItem,
} from "../../api/playlist";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";
import { getCurrentUserId } from "../../utils/auth";
import { isSystemPlaylist } from "../../api/playlist";

import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdDelete, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import { FiEdit3 } from "react-icons/fi";

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "delete", label: "지우기", icon: <MdDelete size={18} /> },
] as const;

const toSeconds = (duration?: number) => {
    return duration ?? 0;
};

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


export default function PlaylistDetailPage() {
    const { playlistId } = useParams();
    const { playTracks, enqueueTracks } = usePlayer();
    const navigate = useNavigate();

    const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentUserId = getCurrentUserId();
    
    // ✅ Hook을 컴포넌트 최상단에 선언 (early return 이전)
    const [localLiked, setLocalLiked] = useState(false);
    const [localLikeCount, setLocalLikeCount] = useState(0);
    const [checkedIds, setCheckedIds] = useState<Record<number, boolean>>({});

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    // 플레이리스트 상세 정보 로드
    const fetchPlaylistDetail = async () => {
        if (!playlistId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await getPlaylistDetail(playlistId);
            setPlaylist(data);
        } catch (err: any) {
            console.error("[PlaylistPage] 플레이리스트 로딩 실패:", err);
            const errorMessage = 
                err?.response?.status === 404 
                    ? "플레이리스트를 찾을 수 없습니다" 
                    : "플레이리스트를 불러올 수 없습니다";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylistDetail();
    }, [playlistId]);
    
    // ✅ playlist 로드되면 좋아요 상태 업데이트
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
        
            if (mode === "replace") {
            playTracks(pendingPlay.tracks, { shuffle: isShuffle });
            } else {
            enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });
            }
        
            setCheckedIds({});
            setPendingPlay(null);
            setPlayConfirmOpen(false);
    };


    const tracks = playlist?.items ?? [];
    const coverUrls = tracks
        .map((t) => t.music.album.cover_image)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .slice(0, 4);


    const toPlayerTrack = (t: PlaylistItem): PlayerTrack => ({
        id: String(t.item_id),
        musicId: t.music.music_id,
        title: t.music.title,
        artist: t.music.artist.name,
        coverUrl: t.music.album.cover_image,
        audioUrl: "/audio/sample.mp3",
        duration: t.music.duration ? `${Math.floor(t.music.duration / 60)}:${String(t.music.duration % 60).padStart(2, "0")}` : "0:00",
    });

    // 체크된 곡만
    const checkedTracks = tracks
        .filter((t) => !!checkedIds[t.item_id])
        .map(toPlayerTrack);

    const selectedCount = checkedTracks.length;

    const deleteSelected = async () => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (!playlist) return;
        if (selectedCount === 0) return;

        const ok = confirm(`${selectedCount}곡을 이 플레이리스트에서 삭제할까요?`);
        if (!ok) return;

        try {
            const itemIds = tracks
                .filter((t) => !!checkedIds[t.item_id])
                .map((t) => t.item_id);

            await deletePlaylistItems(playlist.playlist_id, itemIds);
            setCheckedIds({});
            
            // 플레이리스트 새로고침
            await fetchPlaylistDetail();
        } catch (error) {
            console.error("곡 삭제 실패:", error);
        }
    };



    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds(t.music.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    // 로딩 중
    if (loading) {
        return (
            <div className="w-full min-w-0 px-6 py-5 text-white">
                <div className="p-4 text-[#F6F6F6]/70">로딩중...</div>
            </div>
        );
    }

    // 오류 또는 데이터 없음
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
                    <div className="mt-2 text-sm text-[#aaa]">
                        {error || `요청한 ID: ${playlistId ?? "(없음)"}`}
                    </div>
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

    const toggleOne = (id: number) =>
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));

    // 시스템 플레이리스트 판별
    const isSystemPl = isSystemPlaylist(playlist.title);
    
    // 편집 버튼 표시 조건
    const canEdit = currentUserId !== null && 
                    playlist.user_id === currentUserId && 
                    !isSystemPl;

    // 좋아요 토글
    const toggleLike = async () => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

        // 낙관적 UI 업데이트
        const wasLiked = localLiked;
        setLocalLiked(!wasLiked);
        setLocalLikeCount((prev) => wasLiked ? prev - 1 : prev + 1);

        try {
            if (wasLiked) {
                await unlikePlaylist(playlist.playlist_id);
            } else {
                await likePlaylist(playlist.playlist_id);
            }
            
            // API 응답 후 플레이리스트 새로고침
            await fetchPlaylistDetail();
        } catch (error) {
            console.error("좋아요 토글 실패:", error);
            // 실패 시 원래 상태로 복구
            setLocalLiked(wasLiked);
            setLocalLikeCount(playlist.like_count);
        }
    };

    return (
        <div className="w-full min-w-0 overflow-x-auto">
        {/* 상단 */}
        <section className="relative overflow-visible">
            <div className="relative h-72 bg-[#1D1D1D]/70 border-b border-[#3D3D3D] overflow-hidden">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-4 top-5 z-10 p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
                title="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>

             {/* 시스템 플레이리스트 하트 표시 (오른쪽 상단) */}
            {isSystemPl && (
                <div 
                    className="absolute right-4 top-5 z-10 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
                    title="나의 좋아요 목록"
                >
                    <MdFavorite size={24} className="text-[#E4524D]" />
                </div>
            )}

            {/* 편집 버튼 (조건부 표시) */}
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
                <div className="px-12 pb-8 flex items-end gap-8 min-w-[1100px] shrink-0">
                <div className="w-[228px] h-[228px] shrink-0" />

                <div className="flex items-end gap-5">
                    <div className="min-w-0">
                        {/* 좋아요 (플리 좋아요 토글) - 공개이면서 내가 만들지 않은 플레이리스트에만 표시 */} 
                        {playlist.visibility === "public" && currentUserId !== playlist.user_id && (
                            <button 
                                type="button" 
                                onClick={toggleLike} 
                                className={[
                                    "h-11 rounded-2xl",
                                    "flex items-center gap-2",
                                    "transition",
                                    localLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                                ].join(" ")} 
                                aria-label="좋아요" 
                                title="좋아요" 
                            >
                                <MdFavorite 
                                    size={22} 
                                    className={localLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"} 
                                />
                                <span className="text-sm tabular-nums">
                                    {localLikeCount.toLocaleString()}
                                </span>
                            </button>
                        )}

                        <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none truncate">
                            {playlist.title}
                        </div>

                        <div className="mt-2 text-sm text-[#F6F6F6]/60 truncate">
                            {playlist.creator_nickname} · {playlist.visibility === "public" ? "공개" : "비공개"} ·{" "}
                            {tracks.length}곡 · {totalPlaytime}
                        </div>
                    </div>

                   <button
                    type="button"
                    onClick={() => {
                        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                        if (tracks.length === 0) return;

                        // ✅ 체크된 곡이 있으면 그 첫 곡부터, 없으면 앨범 첫 곡부터
                        const list = selectedCount > 0 ? checkedTracks : tracks.map(toPlayerTrack);
                        playTracks(list);
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
            <div
            className="
                absolute left-12 top-28
                w-[228px] h-[228px]
                rounded-3xl overflow-hidden
                bg-[#777777]
                z-20 shadow-xl
            ">
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                {Array.from({ length: 4 }).map((_, i) => {
                const url = coverUrls[i];
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
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#464646]">
                <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-semibold text-[#F6F6F6]">곡 전체보기</h2>
                    <div className="text-sm text-[#999999]">총 {tracks.length}곡</div>
                </div>
                </div>

            <div className="mt-4 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar">
                {actions.filter((a) => !(isSystemPl && a.key === "delete")).map((a) => {
                    const disabled =
                    (a.key === "play" || a.key === "shuffle"|| a.key === "delete") && selectedCount === 0;

                    const onClick = () => {
                    if (!requireLogin("로그인 후 이용 가능합니다.")) return;

                    // ✅ like는 기존대로 앨범 좋아요 토글
                    if (a.key === "delete") {
                        deleteSelected();
                        return;
                    }

                    // ✅ play / shuffle은 "선택된 곡"이 없으면 동작 X
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
                        <span className="whitespace-nowrap">
                        {a.label}
                        </span>
                    </button>
                    );
                })}
                </div>
            </div>
                {loading && (
                <div className="px-8 py-3 text-sm text-[#F6F6F6]/60 border-b border-[#464646]">
                    불러오는 중...
                </div>
                )}

                {error && (
                <div className="px-8 py-3 text-sm text-red-400 border-b border-[#464646]">
                    {error}
                </div>
                )}
            <div className="px-6 pt-4">
                <div className="grid items-center grid-cols-[28px_56px_1fr_90px] gap-x-4 pb-3 text-xs text-[#F6F6F6]/60">
                <label className="flex items-center justify-center">
                    <input
                    type="checkbox"
                    className="accent-[#f6f6f6]"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                    onClick={(e) => e.stopPropagation()}
                    />
                </label>
                <div className="col-span-2 border-l px-2 border-[#464646]">곡정보</div>
                <div className="text-right border-r px-2 border-[#464646]">길이</div>
                </div>
            </div>

            <div className="border-b border-[#464646]" />

            <div className="pb-6">
                {tracks.map((t) => (
                <div
                    key={t.item_id}
                    className="w-full text-left grid grid-cols-[28px_42px_1fr_90px] items-center gap-x-5 py-2 px-6 border-b border-[#464646] hover:bg-white/5 transition"
                >
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="accent-[#f6f6f6]"
                            checked={!!checkedIds[t.item_id]}
                            onChange={() => toggleOne(t.item_id)}
                            aria-label={`${t.music.title} 선택`}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-[#6b6b6b]/50 border border-[#464646] overflow-hidden">
                        {t.music.album.cover_image && (
                            <img 
                                src={t.music.album.cover_image} 
                                alt={t.music.album.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                    </div>


                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">{t.music.title}</div>
                        <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                            {t.music.artist.name} · {t.music.album.title}
                        </div>
                    </div>

                    <div className="mr-1 text-sm text-[#F6F6F6]/70 text-right tabular-nums">
                        {t.music.duration ? `${Math.floor(t.music.duration / 60)}:${String(t.music.duration % 60).padStart(2, "0")}` : "0:00"}
                    </div>
                </div>
                ))}

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
            </section>
        </div>
        </div>
    );
}