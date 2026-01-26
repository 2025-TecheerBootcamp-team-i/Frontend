// AiSongPage.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAiSongById } from "../../mocks/aiSongMock";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { getCurrentUserId } from "../../utils/auth";

import {
  listMyPlaylists,
  addPlaylistItems,
  type PlaylistSummary,
} from "../../api/playlist";
import {
  likeTrack,
  deleteTrack,
  likecount,
} from "../../api/LikedSong";

import {
  MdPlayArrow,
  MdShare,
  MdAdd,
  MdFavoriteBorder,
  MdContentCopy,
  MdFavorite,
  MdDelete,
} from "react-icons/md";
import { IoChevronBack } from "react-icons/io5";

type AiTrack = {
  musicId: number; // 백엔드 music_id
  title: string;
  desc: string;
  duration: string;
  createdAt: string;
  isAi: boolean;
  artist: string;
  plays: number;
  lyrics: string;

  coverUrl?: string;
  audioUrl?: string;
  prompt?: string;

  ownerId?: string;
  ownerName?: string;
};

const FADE_STYLE = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ✅ any 없이 안전하게 mock → AiTrack 변환
function mapMockToAiTrack(raw: unknown, fallbackId: string): AiTrack | null {
  if (raw === null || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const musicId =
    typeof obj.musicId === "number"
      ? obj.musicId
      : typeof obj.id === "number"
        ? obj.id
        : Number(fallbackId);

  if (!Number.isFinite(musicId)) return null;

  const title = typeof obj.title === "string" ? obj.title : "제목 없음";
  const desc = typeof obj.desc === "string" ? obj.desc : "";
  const duration = typeof obj.duration === "string" ? obj.duration : "--:--";
  const createdAt = typeof obj.createdAt === "string" ? obj.createdAt : "";
  const isAi = typeof obj.isAi === "boolean" ? obj.isAi : true;
  const artist = typeof obj.artist === "string" ? obj.artist : "Unknown";
  const plays = typeof obj.plays === "number" ? obj.plays : 0;

  const lyrics =
    typeof obj.lyrics === "string"
      ? obj.lyrics
      : typeof obj.prompt === "string"
        ? obj.prompt
        : "내용이 없습니다.";

  const coverUrl = typeof obj.coverUrl === "string" ? obj.coverUrl : undefined;
  const audioUrl = typeof obj.audioUrl === "string" ? obj.audioUrl : undefined;
  const prompt = typeof obj.prompt === "string" ? obj.prompt : undefined;

  const ownerId = typeof obj.ownerId === "string" ? obj.ownerId : undefined;
  const ownerName = typeof obj.ownerName === "string" ? obj.ownerName : undefined;

  return {
    musicId,
    title,
    desc,
    duration,
    createdAt,
    isAi,
    artist,
    plays,
    lyrics,
    coverUrl,
    audioUrl,
    prompt,
    ownerId,
    ownerName,
  };
}

function ActionCircle({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={label}
      disabled={disabled}
      className={`
        shrink-0
        w-12 h-12 rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${disabled
          ? "bg-[#444444] text-white/30 cursor-not-allowed"
          : `
              bg-[#f6f6f6]/20
              text-[#f6f6f6]
              hover:bg-[#AFDEE2]
              hover:text-[#1f1f1f]
              active:scale-95
            `
        }
      `}
    >
      {icon}
    </button>
  );
}

export default function AiSongPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // ✅ env: "https://.../api/v1" 같은 형태면, 아래 fetch에서 `${API_BASE}/${id}/`
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  const [track, setTrack] = useState<AiTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [copyToast, setCopyToast] = useState<string | null>(null);

  // ✅ 좋아요 여부(= liked 시스템 플리에 존재하는지)
  const [liked, setLiked] = useState(false);

  // ✅ 담기 모달 상태
  const [addOpen, setAddOpen] = useState(false);
  const [addTargets, setAddTargets] = useState<PlaylistSummary[]>([]);

  useEffect(() => {
    // 플레이리스트 목록 로드 (Real API)
    const loadPlaylists = async () => {
      try {
        const myPlaylists = await listMyPlaylists();
        setAddTargets(myPlaylists);
      } catch (err) {
        console.error("Failed to load user playlists:", err);
      }
    };

    if (addOpen) {
      loadPlaylists();
    }
  }, [addOpen]);

  useEffect(() => {
    if (!copyToast) return;
    const t = setTimeout(() => setCopyToast(null), 2000);
    return () => clearTimeout(t);
  }, [copyToast]);

  const [mode, setMode] = useState<"summary" | "full">("summary");

  const clampText = (text: string, max: number) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "..." : text;
  };

  const styleText = track?.desc ?? "";
  const styleTextToShow =
    mode === "summary" ? clampText(styleText, 50) : styleText;

  const artist = track?.artist ?? "Unknown Artist";
  const lyricsOrPrompt = track?.lyrics ?? track?.prompt ?? "내용이 없습니다.";

  // ✅ API 없을 때 mock fallback (unknown으로 받고, mapMockToAiTrack로 변환)
  const dummyFound = useMemo<unknown>(() => {
    if (!id) return null;
    const musicId = parseInt(id, 10);
    if (Number.isNaN(musicId)) return null;
    return getAiSongById(musicId);
  }, [id]);

  useEffect(() => {
    if (!track) return;
    setTitleDraft(track.title ?? "");
  }, [track]);

  const CURRENT_USER_ID = String(getCurrentUserId() ?? "").trim();
  const OWNER_ID = String(track?.ownerId ?? "").trim();
  const isOwner = OWNER_ID.length > 0 && OWNER_ID === CURRENT_USER_ID;

  // ✅ liked 동기화 (Real API)
  useEffect(() => {
    if (!track) return;

    const syncLiked = async () => {
      try {
        const res = await likecount(track.musicId);
        setLiked(res.is_liked);
      } catch (e) {
        console.error("Failed to fetch like status", e);
      }
    };

    syncLiked();
  }, [track]);

  const toggleLike = async () => {
    if (!track) return;

    const prevLiked = liked;
    // 낙관적 업데이트
    setLiked(!prevLiked);

    try {
      if (prevLiked) {
        // 취소
        await deleteTrack(track.musicId);
      } else {
        // 좋아요
        await likeTrack(track.musicId);
      }
    } catch (e) {
      console.error("like toggle failed", e);
      // 롤백
      setLiked(prevLiked);
      setCopyToast("요청 처리에 실패했습니다.");
    }
  };

  const commitTitle = async () => {
    if (!track) return;
    if (!isOwner) return;

    const nextTitle = titleDraft.trim() || "제목 없음";
    setTrack((prev) => (prev ? { ...prev, title: nextTitle } : prev));
    setIsEditingTitle(false);

    if (API_BASE) {
      try {
        const token = localStorage.getItem("access_token");
        await fetch(`${API_BASE}/${track.musicId}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ title: nextTitle }),
        });
      } catch (e) {
        console.error("title save failed", e);
      }
    }
  };

  const cancelTitle = () => {
    if (!track) return;
    setTitleDraft(track.title ?? "");
    setIsEditingTitle(false);
  };

  // ✅ 남의 곡 보고 있을 때 편집모드가 켜져있으면 자동 종료
  useEffect(() => {
    if (!isOwner && isEditingTitle) setIsEditingTitle(false);
  }, [isOwner, isEditingTitle]);

  // ✅ 데이터 로딩
  useEffect(() => {
    if (!id) {
      setError("잘못된 접근입니다. (id 없음)");
      return;
    }

    // API 없으면 mock
    if (!API_BASE) {
      const mapped = mapMockToAiTrack(dummyFound, id);
      if (!mapped) {
        setTrack(null);
        setError("해당 곡을 찾지 못했습니다.");
        return;
      }
      setTrack(mapped);
      setError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/${id}/`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error(`API 오류: ${res.status}`);
        const data: unknown = await res.json();

        // duration: seconds -> "m:ss"
        const formatDuration = (seconds: number): string => {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs.toString().padStart(2, "0")}`;
        };

        // created_at: "M월 D일"
        const formatKoreanDate = (dateString: string): string => {
          try {
            const date = new Date(dateString);
            return `${date.getMonth() + 1}월 ${date.getDate()}일`;
          } catch {
            return dateString;
          }
        };

        if (data === null || typeof data !== "object") {
          throw new Error("API 응답 형식이 올바르지 않습니다.");
        }

        const obj = data as Record<string, unknown>;

        const musicIdNum =
          typeof obj.music_id === "number" ? obj.music_id : Number(id);
        if (!Number.isFinite(musicIdNum)) throw new Error("music_id가 올바르지 않습니다.");

        const aiInfo =
          obj.ai_info && typeof obj.ai_info === "object"
            ? (obj.ai_info as Record<string, unknown>)
            : null;

        const inputPrompt =
          aiInfo && typeof aiInfo.input_prompt === "string" ? aiInfo.input_prompt : "";
        const convertedPrompt =
          aiInfo && typeof aiInfo.converted_prompt === "string" ? aiInfo.converted_prompt : "";

        const createdAt =
          typeof obj.created_at === "string" ? formatKoreanDate(obj.created_at) : "";

        const duration =
          typeof obj.duration === "number" ? formatDuration(obj.duration) : "--:--";

        const coverUrl = typeof obj.album_image === "string" ? obj.album_image : undefined;
        const audioUrl = typeof obj.audio_url === "string" ? obj.audio_url : undefined;

        // user / artist 이름 매핑 (안전하게)
        const user =
          obj.user && typeof obj.user === "object"
            ? (obj.user as Record<string, unknown>)
            : null;

        const nickname = user && typeof user.nickname === "string" ? user.nickname : undefined;

        const artistObj =
          obj.artist && typeof obj.artist === "object"
            ? (obj.artist as Record<string, unknown>)
            : null;

        const artistNameFromArtistObj =
          artistObj && typeof artistObj.artist_name === "string" ? artistObj.artist_name : undefined;

        const artistNameFromRoot =
          typeof obj.artist_name === "string" ? obj.artist_name : undefined;

        const finalArtist =
          nickname ?? artistNameFromRoot ?? artistNameFromArtistObj ?? "Unknown";

        const plays = typeof obj.plays === "number" ? obj.plays : 0;

        const lyrics =
          typeof obj.lyrics === "string"
            ? obj.lyrics
            : inputPrompt || convertedPrompt || "내용이 없습니다.";

        const title =
          typeof obj.music_name === "string" ? obj.music_name : "제목 없음";

        const ownerId =
          typeof obj.user_id === "number"
            ? String(obj.user_id)
            : typeof obj.user_id === "string"
              ? obj.user_id
              : user && typeof user.id === "number"
                ? String(user.id)
                : user && typeof user.id === "string"
                  ? user.id
                  : undefined;

        const mapped: AiTrack = {
          musicId: musicIdNum,
          title,
          desc: inputPrompt || convertedPrompt || "",
          duration,
          createdAt,
          isAi: typeof obj.is_ai === "boolean" ? obj.is_ai : true,
          coverUrl,
          audioUrl,
          prompt: inputPrompt || convertedPrompt || "",
          artist: finalArtist,
          plays,
          lyrics,
          ownerId,
          ownerName: nickname,
        };

        setTrack(mapped);
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;

        const mapped = mapMockToAiTrack(dummyFound, id);
        if (mapped) setTrack(mapped);

        setError(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, id, dummyFound]);

  /** =========================
   * ✅ 액션버튼 패턴 (단일 곡 = 현재곡 1개)
   ========================= */
  const { playTracks } = usePlayer();

  const selectedTracks = useMemo<PlayerTrack[]>(() => {
    if (!track) return [];
    return [
      {
        id: track.musicId.toString(),
        title: track.title,
        artist: track.artist ?? "AI Artist",
        duration: track.duration,
        audioUrl: track.audioUrl ?? "/audio/sample.mp3",
        coverUrl: track.coverUrl,
        musicId: track.musicId,
      },
    ];
  }, [track]);

  const selectedCount = selectedTracks.length;

  // ✅ 담기(현재 곡 1개 → 특정 플리)
  const addSelectedToPlaylist = async (playlistId: number) => {
    if (selectedCount === 0) return;

    try {
      // 선택된 musicId들 추출 (여기선 단일 곡)
      const musicIds = selectedTracks.map(t => t.musicId ?? parseInt(t.id));

      // API 호출
      await addPlaylistItems(playlistId, musicIds);

      setCopyToast("플레이리스트에 곡을 추가했습니다.");
      setAddOpen(false);
    } catch (err) {
      console.error("Failed to add tracks to playlist:", err);
      setCopyToast("추가에 실패했습니다.");
    }
  };

  const shareSelected = async () => {
    if (selectedCount === 0) return;

    const text = `- ${track?.title ?? ""} (${track?.duration ?? ""})`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "AI 곡 공유", text });
        return;
      }
    } catch {
      // ignore
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyToast("곡 정보를 복사했어요!");
    } catch {
      setCopyToast("공유에 실패했습니다. (클립보드 권한 확인)");
    }
  };

  // ✅ 삭제 (내가 만든 곡만)
  const deleteSong = async () => {
    if (!track) return;
    if (!isOwner) return;

    const ok = window.confirm("이 곡을 삭제할까요? (되돌릴 수 없어요)");
    if (!ok) return;

    // 2) 서버 삭제
    if (API_BASE) {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/${track.musicId}/`, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`삭제 실패: ${res.status}`);
      } catch (e) {
        console.error("delete failed", e);
        setCopyToast("삭제에 실패했습니다.");
        return;
      }
    }

    setCopyToast("삭제되었습니다.");
    navigate(-1);
  };

  type ActionKey = "play" | "add" | "share" | "delete";

  const handleAction = (key: ActionKey) => {
    if (selectedCount === 0) return;

    if (key === "play") playTracks(selectedTracks);
    if (key === "add") setAddOpen(true);
    if (key === "share") shareSelected();
    if (key === "delete") deleteSong();
  };

  return (
    // ✅ 전체 글씨체 한 단계 업: base -> lg
    <div className="w-full h-full overflow-x-auto pr-10 text-lg">
      <section className="text-[#f6f6f6] min-w-[1000px]">
        <style className="whitespace-none">{FADE_STYLE}</style>

        {copyToast && (
          <div
            className="
              fixed left-1/2 top-6 -translate-x-1/2 z-50
              rounded-full bg-black/70 px-4 py-2 text-base text-white
              border border-white/10 backdrop-blur"
            role="status"
            aria-live="polite"
          >
            {copyToast}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-base">
            {error}
          </div>
        )}

        {track && (
          <div className="flex pt-2 items-start gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
              className="p-2 text-[#f6f6f6] rounded-full hover:bg-white/10 transition shrink-0"
            >
              <IoChevronBack size={24} />
            </button>

            <div className="mt-10 flex flex-col min-w-0 w-full">
              <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-6 w-full min-w-0">
                <div
                  className="w-72 h-72 rounded-2xl overflow-hidden shadow-md bg-[#3d3d3d]/90 border border-[#3d3d3d] shrink-0"
                  style={{ aspectRatio: "2 / 3" }}
                >
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt="cover"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        console.error(
                          "[AISongPage] 이미지 표시 실패:",
                          track.coverUrl
                        );
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#777777] text-base">
                      커버 없음
                    </div>
                  )}
                </div>

                <div className="h-72 min-w-0 w-full pr-4">
                  <div className="flex items-start justify-between gap-4 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`
                          flex items-end gap-3 w-full
                          border-b-2 pb-3
                          ${isEditingTitle && isOwner
                            ? "border-[#f6f6f6]"
                            : "border-[#464646]"
                          }
                          ${isOwner ? "hover:border-[#7a7a7a]" : ""}
                        `}
                      >
                        <input
                          value={titleDraft}
                          readOnly={!isEditingTitle || !isOwner}
                          onChange={(e) => setTitleDraft(e.target.value)}
                          onClick={() => {
                            if (!isOwner) return;
                            if (!isEditingTitle) setIsEditingTitle(true);
                          }}
                          onBlur={() => {
                            if (isEditingTitle && isOwner) commitTitle();
                          }}
                          onKeyDown={(e) => {
                            if (!isOwner) return;
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitTitle();
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelTitle();
                            }
                          }}
                          className={`
                            flex-1 min-w-0 w-full
                            bg-transparent outline-none border-0
                            text-5xl font-semibold leading-tight
                            ${isOwner
                              ? isEditingTitle
                                ? "text-[#f6f6f6] cursor-text"
                                : "text-[#f6f6f6] cursor-pointer"
                              : "text-[#f6f6f6] cursor-default"
                            }
                            ${!isEditingTitle ? "truncate" : ""}
                          `}
                          title={
                            !isOwner
                              ? "다른 사용자가 만든 곡은 제목을 수정할 수 없습니다."
                              : undefined
                          }
                        />
                      </div>

                      <div className="text-base text-[#f6f6f6]">
                        {loading ? "불러오는 중..." : error ? "오류" : " "}
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#d9d9d9] shrink-0" />
                        <div className="text-lg text-[#f6f6f6]">{artist}</div>
                      </div>

                      {styleText && (
                        <div className="mt-4 w-full min-w-0">
                          <div className="flex items-start gap-2 w-full min-w-0">
                            <p
                              key={mode}
                              style={{ animation: "fadeSlideIn 180ms ease-out" }}
                              className="flex-1 min-w-0 w-full text-base text-[#f6f6f6] leading-snug whitespace-normal break-words"
                            >
                              {styleTextToShow}
                            </p>

                            <button
                              type="button"
                              aria-label="copy description"
                              className="shrink-0 rounded-md text-[#f6f6f6] hover:text-white hover:bg-white/10 transition p-1 px-2"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(styleText);
                                  setCopyToast("곡 스타일과 설명을 복사했습니다");
                                } catch {
                                  setCopyToast("복사에 실패했습니다");
                                }
                              }}
                            >
                              <MdContentCopy size={16} />
                            </button>
                          </div>

                          <div className="text-sm">
                            {mode === "summary" ? (
                              <button
                                type="button"
                                onClick={() => setMode("full")}
                                className="text-[#f6f6f6]/50 hover:text-[#f6f6f6] underline underline-offset-2 transition"
                              >
                                + Show full style
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setMode("summary")}
                                className="text-[#f6f6f6]/50 hover:text-[#f6f6f6] underline underline-offset-2 transition"
                              >
                                - Show summary
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-base text-[#f6f6f6]">
                          {track.createdAt} | {track.duration}
                        </div>
                      </div>

                      <div className="mt-4 flex items-end gap-2 flex-nowrap overflow-x-auto">
                        <ActionCircle
                          icon={<MdPlayArrow size={20} />}
                          label="재생"
                          onClick={() => handleAction("play")}
                          disabled={selectedCount === 0}
                        />
                        <ActionCircle
                          icon={<MdShare size={18} />}
                          label="공유"
                          onClick={() => handleAction("share")}
                          disabled={selectedCount === 0}
                        />
                        <ActionCircle
                          icon={<MdAdd size={20} />}
                          label="담기"
                          onClick={() => handleAction("add")}
                          disabled={selectedCount === 0}
                        />
                        <ActionCircle
                          icon={
                            liked ? (
                              <MdFavorite size={18} />
                            ) : (
                              <MdFavoriteBorder size={18} />
                            )
                          }
                          label="좋아요"
                          onClick={toggleLike}
                          disabled={selectedCount === 0}
                        />

                        {/* ✅ 내가 만든 곡이면 삭제 버튼 표시 */}
                        {isOwner && (
                          <ActionCircle
                            icon={<MdDelete size={18} />}
                            label="삭제"
                            onClick={() => handleAction("delete")}
                            disabled={selectedCount === 0}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 mb-8 grid grid-cols-[220px_minmax(0,1fr)] gap-6 w-full min-w-0">
                <pre className="whitespace-pre-wrap text-base text-[#f6f6f6] leading-relaxed min-w-0">
                  {lyricsOrPrompt}
                </pre>
                <div />
              </div>
            </div>
          </div>
        )}

        {/* ✅ 담기 모달 */}
        {addOpen && (
          <div className="fixed inset-0 z-[999] whitespace-normal">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setAddOpen(false)}
              aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                  <div className="text-lg font-semibold text-[#F6F6F6]">
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

                <div className="px-6 py-4 text-base text-[#F6F6F6]/70">
                  선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
                </div>

                <div className="max-h-[360px] overflow-y-auto border-t border-[#464646]">
                  {addTargets.length === 0 ? (
                    <div className="px-6 py-6 text-base text-[#aaa]">
                      담을 수 있는 플레이리스트가 없어요.
                      <div className="mt-2 text-sm text-[#777]">
                        (liked 같은 시스템 플리는 제외됨)
                      </div>
                    </div>
                  ) : (
                    addTargets.map((p) => (
                      <button
                        key={p.playlist_id}
                        type="button"
                        onClick={() => addSelectedToPlaylist(p.playlist_id)}
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                      >
                        <div className="text-base font-semibold text-[#F6F6F6] truncate">
                          {p.title}
                        </div>
                        <div className="mt-1 text-sm text-[#F6F6F6]/60 truncate">
                          {p.creator_nickname} · {p.visibility === "public" ? "공개" : "비공개"}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="px-4 py-2 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
