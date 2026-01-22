import axios from "axios"
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { fetchLikedTracks, type LikedTrack } from "../../api/LikedSong";
import { requireLogin } from "../../api/auth";

import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdDelete, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import { FiEdit3 } from "react-icons/fi";

// 라우팅 분기점
const LIKED_SYSTEM_ID = "liked";

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "delete", label: "지우기", icon: <MdDelete size={18} /> },
] as const;

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  albumImage?: string | null;
};

type PlaylistView = {
  id: string;
  title: string;
  owner: string;
  isPublic: boolean;
  likeCount: number;
  tracks: TrackRow[];
  isLiked?: boolean;
};

const toSeconds = (duration: string) => {
    const [m, s] = duration.split(":").map((v) => Number(v));
    if (!Number.isFinite(m) || !Number.isFinite(s)) return 0;
    return m * 60 + s;
};

const formatMmss = (sec: number) => {
  const safe = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const formatTotal = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
};


// ✅ utils/auth 의존 없이 user_id 가져오기 (프로젝트 저장 키에 맞게 조정)
const getStoredUserId = (): number | null => {
  const userRaw = localStorage.getItem("user");
  if (!userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as { id?: number | string };
    const n = Number(user.id);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

// ✅ (TODO) 일반 플레이리스트 상세 API (엔드포인트 확정되면 여기만 구현하면 됨)
async function fetchPlaylistDetailApi(_playlistId: string): Promise<PlaylistView> {

  throw new Error("플레이리스트 상세 API가 아직 연결되지 않았습니다.");
}

// ✅ (TODO) 플레이리스트 좋아요 토글 API
async function togglePlaylistLikeApi(_playlistId: string): Promise<{ isLiked: boolean; likeCount: number }> {
  throw new Error("플레이리스트 좋아요 API가 아직 연결되지 않았습니다.");
}

// ✅ (TODO) 플레이리스트에서 곡 삭제 API
async function deletePlaylistItemsApi(_playlistId: string, _trackIds: string[]): Promise<void> {
  throw new Error("플레이리스트 곡 삭제 API가 아직 연결되지 않았습니다.");
}

export default function PlaylistDetailPage() {
    const { playlistId } = useParams();
    const { playTracks, enqueueTracks } = usePlayer();
    const navigate = useNavigate();

    const isLikedSystem = playlistId === LIKED_SYSTEM_ID;

    // store 변경(emit)에도 반응하게 playlist를 state로 들고 sync
    const [playlist, setPlaylist] = useState<PlaylistView | null>(null)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!playlistId) return;

        let cancelled = false;

        (async () => {
        try {
            setLoading(true);
            setError(null);

            if (isLikedSystem) {
            if (!requireLogin("로그인 후 이용 가능합니다.")) {
                throw new Error("로그인 후 이용 가능합니다.");
            }

            const userId = getStoredUserId();
            if (!userId) {
                 setPlaylist({
                id: LIKED_SYSTEM_ID,
                title: "나의 좋아요 목록",
                owner: "내 컬렉션",
                isPublic: false,
                likeCount: 0,
                tracks: [],
                isLiked: true,
            });
            setError("user_id를 찾을 수 없어요. 로그인 후 user_id 저장을 확인해주세요.");
            return;
            }
    
        const likedTracks: LikedTrack[] = await fetchLikedTracks(userId);

          // ✅ 기존 UI가 기대하는 TrackRow로 정규화
          const tracks: TrackRow[] = likedTracks.map((t) => ({
            id: String(t.music_id),
            title: t.music_name,
            artist: t.artist_name,
            album: "",
            duration: formatMmss(t.duration),
            albumImage: t.album_image ?? null,
          }));

          const likedPlaylist: PlaylistView = {
            id: LIKED_SYSTEM_ID,
            title: "나의 좋아요 목록",
            owner: "내 컬렉션",
            isPublic: false,
            likeCount: 0,
            tracks,
            isLiked: true,
          };

          if (!cancelled) setPlaylist(likedPlaylist);
          return;
        }

        // ✅ 일반 플레이리스트: 실제 API로 교체 (목업 없음)
        const pl = await fetchPlaylistDetailApi(playlistId);
        if (!cancelled) setPlaylist(pl);
      } catch (e) {
        if (cancelled) return;

        console.error("[PlaylistPage] 로딩 실패:", e);
        if (axios.isAxiosError(e)) {
          console.error("status:", e.response?.status);
          console.error("data:", e.response?.data);
          console.error("url:", e.config?.baseURL, e.config?.url);
        }

        setPlaylist(null);
        setError(e instanceof Error ? e.message : "불러오지 못했어요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playlistId, isLikedSystem]);

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setCheckedIds({});
        }, [playlistId]);

    type PendingPlay = {
        key: "play" | "shuffle";
        tracks: PlayerTrack[];
    };

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

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

    // 플레이리스트 커버 사진 4등분
    const tracks = playlist?.tracks ?? [];
    const coverUrls = tracks
        .map((t) => t.albumImage)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .slice(0, 4);
    //

    type PlaylistTrack = (typeof tracks)[number];

    const toPlayerTrack = (t: PlaylistTrack): PlayerTrack => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    audioUrl: "/audio/sample.mp3",
    });

    // ✅ 체크된 곡만
    const checkedTracks = tracks
    .filter((t) => !!checkedIds[t.id])
    .map(toPlayerTrack);

    const selectedCount = checkedTracks.length;

    const deleteSelected = () => {
            if (!requireLogin("로그인 후 이용 가능합니다.")) return;

            if (!playlist) return;
            if (selectedCount === 0) return;
        
            const ok = confirm(`${selectedCount}곡을 이 플레이리스트에서 삭제할까요?`);
            if (!ok) return;
            
            const checkedSet = new Set(checkedTracks.map((t) => t.id)); // PlayerTrack ids
            const nextTracks = tracks.filter((t) => !checkedSet.has(t.id));
        
            setPlaylist((prev) => (prev ? { ...prev, tracks: nextTracks } : prev));
            // ✅ 체크 초기화
            setCheckedIds({});
    };

    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds(t.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    if (!playlist) {
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
                요청한 ID: <span className="text-white">{playlistId ?? "(없음)"}</span>
            </div>
            </div>
        </div>
        );
    }
    
    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) =>
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));


    // ✅ 플리 좋아요(일반 플리만): API 붙이면 여기서 상태 업데이트
    const liked = !!playlist.isLiked;
    const shownLikeCount = playlist.likeCount;

    const toggleLike = async () => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (isLikedSystem) return; // ✅ 좋아요 시스템은 플리 좋아요 대상 아님

        try {
        const next = await togglePlaylistLikeApi(playlist.id);
        setPlaylist((prev) => (prev ? { ...prev, isLiked: next.isLiked, likeCount: next.likeCount } : prev));
        } catch (e) {
        console.error("[PlaylistPage] 플리 좋아요 토글 실패:", e);
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

             {/* 편집 버튼 */}
            <button
                type="button"
                onClick={() => {
                    if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                    navigate(`/playlist/${playlist.id}/edit`)}
                }
                className="absolute right-4 top-5 z-10 px-4 py-2 rounded-2xl bg-white/10 text-[#F6F6F6] hover:bg-white/15 transition flex items-center gap-2"
                aria-label="플레이리스트 편집"
                title="편집"
            >
                <FiEdit3 size={16} />
                <span className="text-sm font-semibold">편집</span>
            </button>

            <div className="absolute inset-0 flex items-end">
                <div className="px-12 pb-8 flex items-end gap-8 min-w-[1100px] shrink-0">
                <div className="w-[228px] h-[228px] shrink-0" />

                <div className="flex items-end gap-5">
                    <div className="min-w-0">
                   {/* ✅ 좋아요 (플리 좋아요 토글) */} 
                    {playlist.isPublic && 
                    ( <button 
                        type="button" 
                        onClick={toggleLike} 
                        className={[ "h-11 rounded-2xl", "flex items-center gap-2", "transition", liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80", ].join(" ")} 
                        aria-label="좋아요" 
                        title="좋아요" 
                        > <MdFavorite size={22} 
                            className={liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"} 
                            /> <span className="text-sm tabular-nums"> 
                            {shownLikeCount.toLocaleString()} </span>
                    </button> )}

                    <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none truncate">
                        {playlist.title}
                    </div>

                    <div className="mt-2 text-sm text-[#F6F6F6]/60 truncate">
                        {playlist.owner} · {playlist.isPublic ? "공개" : "비공개"} ·{" "}
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
                rounded-3xl bg-[#777777]
                z-20
                shadow-xl
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
                {actions.filter((a) => !(isLikedSystem && a.key === "delete")).map((a) => {
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
                    key={t.id}
                    className="w-full text-left grid grid-cols-[28px_42px_1fr_90px] items-center gap-x-5 py-2 px-6 border-b border-[#464646] hover:bg-white/5 transition"
                >
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={!!checkedIds[t.id]}
                        onChange={() => toggleOne(t.id)}
                        aria-label={`${t.title} 선택`}
                        onClick={(e) => e.stopPropagation()}
                    />
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]">
                        {t.albumImage ? (
                            <img
                            src={t.albumImage}
                            alt={`${t.title} cover`}
                            className="w-full h-full rounded-xl object-cover"
                            loading="lazy"
                            onError={(e) => {
                                // 이미지 깨질 때 fallback (선택)
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                            />
                        ) : null}
                    </div>
                    <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">{t.title}</div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                        {t.artist}
                        {t.album ? ` · ${t.album}` : ""}
                    </div>
                    </div>

                    <div className="mr-1 text-sm text-[#F6F6F6]/70 text-right tabular-nums">{t.duration}</div>
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