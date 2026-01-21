import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAiSongById, updateAiSong } from "../../mocks/aiSongMock";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import {
  getPlaylistById,
  getUserPlaylists,
  subscribePlaylists,
  updatePlaylist,
  LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";

import {
  MdPlayArrow,
  MdShare,
  MdAdd,
  MdFavoriteBorder,
  MdFileUpload,
  MdContentCopy,
  MdFavorite,
} from "react-icons/md";
import { IoChevronBack } from "react-icons/io5";

type AiTrack = {
  id: string;
  status: "Upload" | "Draft";
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
  musicId?: number; // 백엔드 music_id
};

const FADE_STYLE = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function ActionCircle({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
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
        w-9 h-9 rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${
          disabled
            ? "bg-[#444444] text-white/30 cursor-not-allowed"
            : `
              bg-[#3d3d3d]
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

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  // ✅ 업로드 확인 모달
  const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);

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
  const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

  useEffect(() => {
    const syncTargets = () => setAddTargets(getUserPlaylists());
    syncTargets();
    return subscribePlaylists(syncTargets);
  }, []);

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
  const plays = track?.plays ?? 0;
  const lyricsOrPrompt = track?.lyrics ?? track?.prompt ?? "내용이 없습니다.";

  const dummyFound = useMemo(() => {
    if (!id) return null;
    return getAiSongById(id);
  }, [id]);

  useEffect(() => {
    if (!track) return;
    setTitleDraft(track.title ?? "");
  }, [track]);

  // ✅ 현재 로그인 유저(너희 앱 실제 값으로 교체)
  const CURRENT_USER_ID = "me";

  // ✅ 소유자 여부
  const isOwner = track?.ownerId ? track.ownerId === CURRENT_USER_ID : false;

  // ✅ liked 동기화
  useEffect(() => {
    if (!track) return;

    const syncLiked = () => {
      const likedPl = getPlaylistById(LIKED_SYSTEM_ID);
      const isLiked = !!likedPl?.tracks?.some((t) => t.id === track.id);
      setLiked(isLiked);
    };

    syncLiked();
    return subscribePlaylists(syncLiked);
  }, [track]);

  const toggleLike = () => {
    if (!track) return;

    const likedPl = getPlaylistById(LIKED_SYSTEM_ID);
    if (!likedPl) {
      console.warn("liked 시스템 플레이리스트를 찾지 못했습니다.");
      return;
    }

    const exists = likedPl.tracks.some((t) => t.id === track.id);

    if (exists) {
      const next = likedPl.tracks.filter((t) => t.id !== track.id);
      updatePlaylist(LIKED_SYSTEM_ID, { tracks: next });
      return;
    }

    const incoming = {
      id: track.id,
      title: track.title,
      artist: track.artist ?? "AI Artist",
      album: "",
      duration: track.duration ?? "0:00",
      likeCount: 0,
      kind: "track" as const,
    };

    updatePlaylist(LIKED_SYSTEM_ID, { tracks: [...likedPl.tracks, incoming] });
  };

  const commitTitle = async () => {
    if (!track) return;
    if (!isOwner) return;

    const nextTitle = titleDraft.trim() || "제목 없음";
    setTrack((prev) => (prev ? { ...prev, title: nextTitle } : prev));
    setIsEditingTitle(false);

    if (API_BASE) {
      try {
        // ⚠️ 백엔드 스펙: PATCH /api/v1/{music_id}/
        await fetch(`${API_BASE}/${track.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
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

  // ✅ 데이터 로딩
  useEffect(() => {
    if (!id) {
      setError("잘못된 접근입니다. (id 없음)");
      return;
    }

    if (!API_BASE) {
      setTrack(dummyFound);
      setError(dummyFound ? null : "해당 곡을 찾지 못했습니다.");
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ⚠️ 백엔드 스펙: GET /api/v1/{music_id}/
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
        const data = await res.json();
        
        // 디버깅: API 응답 확인
        console.log("[AISongPage] API 응답:", data);
        console.log("[AISongPage] album_image_square:", data.album_image_square);
        console.log("[AISongPage] album:", data.album);

        // duration을 초 단위에서 "mm:ss" 형식으로 변환
        const formatDuration = (seconds: number): string => {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs.toString().padStart(2, "0")}`;
        };

        // 날짜를 한국어 형식으로 변환
        const formatKoreanDate = (dateString: string): string => {
          try {
            const date = new Date(dateString);
            return `${date.getMonth() + 1}월 ${date.getDate()}일`;
          } catch {
            return dateString;
          }
        };

        const mapped: AiTrack = {
          id: data.music_id?.toString() ?? id,
          status: data.audio_url ? "Upload" : "Draft",
          title: data.music_name ?? "제목 없음",
          desc: data.ai_info?.input_prompt || data.ai_info?.converted_prompt || "",
          duration: typeof data.duration === "number" ? formatDuration(data.duration) : "--:--",
          createdAt: data.created_at ? formatKoreanDate(data.created_at) : "",
          isAi: data.is_ai ?? true,
          coverUrl: data.album_image || undefined,
          audioUrl: data.audio_url || undefined,
          prompt: data.ai_info?.input_prompt || data.ai_info?.converted_prompt || "",
          artist: data.user?.nickname ?? data.artist_name ?? data.artist?.artist_name ?? "Unknown",
          plays: typeof data.plays === "number" ? data.plays : 0,
          lyrics: data.lyrics || data.ai_info?.input_prompt || "내용이 없습니다.",
          ownerId: data.user_id?.toString(),
          ownerName: data.user?.nickname,
          musicId: typeof data.music_id === "number" ? data.music_id : undefined,
        };

        console.log("[AISongPage] mapped coverUrl:", mapped.coverUrl);
        setTrack(mapped);
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;
        if (dummyFound) setTrack(dummyFound);
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, id, dummyFound]);

  // 커버는 서버 응답의 image_large_square 및 album 관련 필드를 우선 사용

  // ✅ 남의 곡 보고 있을 때 편집모드가 켜져있으면 자동 종료
  useEffect(() => {
    if (!isOwner && isEditingTitle) setIsEditingTitle(false);
  }, [isOwner, isEditingTitle]);

  /** =========================
   * ✅ 액션버튼 패턴 (단일 곡 = 현재곡 1개)
   ========================= */
  const { playTracks } = usePlayer();

  const selectedTracks = useMemo<PlayerTrack[]>(() => {
    if (!track) return [];
    return [
      {
        id: track.id,
        title: track.title,
        artist: track.artist ?? "AI Artist",
        duration: track.duration,
        audioUrl: track.audioUrl ?? "/audio/sample.mp3",
        coverUrl: track.coverUrl,
        musicId: track.musicId, // 가사 로드에 필요한 music_id
      },
    ];
  }, [track]);

  const selectedCount = selectedTracks.length;

  // ✅ 담기(현재 곡 1개 → 특정 플리)
  const addSelectedToPlaylist = (playlistId: string) => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(playlistId);
    if (!curr) return;

    const incoming = selectedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: "",
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

  type ActionKey = "play" | "add" | "share";

  const handleAction = (key: ActionKey) => {
    if (selectedCount === 0) return;

    if (key === "play") playTracks(selectedTracks);
    if (key === "add") setAddOpen(true);
    if (key === "share") shareSelected();
  };

  /** =========================
   * ✅ 업로드 확정 (모달의 “업로드” 버튼에서만 실행)
   ========================= */
  const confirmUpload = async () => {
    if (!track || track.status === "Upload") return;

    // 1) UI 반영
    setTrack((prev) => (prev ? { ...prev, status: "Upload" } : prev));

    // 2) 모달 닫기
    setUploadConfirmOpen(false);

    // 3) mock 반영
    try {
      updateAiSong(track.id, { status: "Upload" });
    } catch (e) {
      console.error("mock upload failed", e);
    }

    // 4) 서버 반영
    if (API_BASE) {
      try {
        // ⚠️ 백엔드 스펙: PATCH /api/v1/{music_id}/
        await fetch(`${API_BASE}/${track.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Upload" }),
        });
      } catch (e) {
        console.error("api upload failed", e);
      }
    }
  };

  return (
    <div className="w-full h-full overflow-x-auto pr-10">
      <section className="text-[#f6f6f6] min-w-[1000px]">
        <style className="whitespace-none">{FADE_STYLE}</style>

        {copyToast && (
          <div
            className="
              fixed left-1/2 top-6 -translate-x-1/2 z-50
              rounded-full bg-black/70 px-4 py-2 text-sm text-white
              border border-white/10 backdrop-blur"
            role="status"
            aria-live="polite"
          >
            {copyToast}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm">
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
              <IoChevronBack size={22} />
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
                        console.error("[AISongPage] 이미지 표시 실패:", track.coverUrl);
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      onLoad={() => {
                        console.log("[AISongPage] 이미지 로드 성공:", track.coverUrl);
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#777777] text-sm">
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
                          ${
                            isEditingTitle && isOwner
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
                            text-4xl font-semibold leading-tight
                            ${
                              isOwner
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

                      <div className="text-sm text-[#f6f6f6]">
                        {loading ? "불러오는 중..." : error ? "오류" : " "}
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#d9d9d9] shrink-0" />
                        <div className="text-base text-[#f6f6f6]">{artist}</div>
                      </div>

                      {styleText && (
                        <div className="mt-4 w-full min-w-0">
                          <div className="flex items-start gap-2 w-full min-w-0">
                            <p
                              key={mode}
                              style={{ animation: "fadeSlideIn 180ms ease-out" }}
                              className="flex-1 min-w-0 w-full text-sm text-[#f6f6f6] leading-snug whitespace-normal break-words"
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

                          <div className="text-xs">
                            {mode === "summary" ? (
                              <button
                                type="button"
                                onClick={() => setMode("full")}
                                className="text-[#777777] hover:text-[#f6f6f6] underline underline-offset-2 transition"
                              >
                                + Show full style
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setMode("summary")}
                                className="text-[#777777] hover:text-[#f6f6f6] underline underline-offset-2 transition"
                              >
                                - Show summary
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <div className="text-sm text-[#f6f6f6]">
                          {track.createdAt} | {plays}회 | {track.duration}
                        </div>
                      </div>

                      <div className="mt-6 flex items-end gap-2 flex-nowrap overflow-x-auto">
                        {isOwner && (
                          <button
                            type="button"
                            disabled={track.status === "Upload"}
                            onClick={() => {
                              if (track.status === "Upload") return;
                              // ✅ 여기서는 “모달만 열기”
                              setUploadConfirmOpen(true);
                            }}
                            className={`
                              shrink-0 inline-flex items-center justify-center gap-1
                              w-[120px] h-9 px-3 rounded-full text-sm transition
                              ${
                                track.status === "Upload"
                                  ? "bg-[#555555] text-[#999999] cursor-not-allowed"
                                  : "bg-[#AFDEE2] text-[#1f1f1f] hover:bg-[#87B2B6]"
                              }
                            `}
                            aria-label="upload"
                          >
                            <MdFileUpload size={18} />
                            {track.status === "Upload" ? "업로드됨" : "업로드하기"}
                          </button>
                        )}

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
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 mb-8 grid grid-cols-[220px_minmax(0,1fr)] gap-6 w-full min-w-0">
                <pre className="whitespace-pre-wrap text-sm text-[#f6f6f6] leading-relaxed min-w-0">
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
                        onClick={() => addSelectedToPlaylist(p.id)}
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

        {/* ✅ 업로드 확인 모달 */}
        {uploadConfirmOpen && (
          <div className="fixed inset-0 z-[999] whitespace-normal">
            {/* 바깥 클릭 = 취소 */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setUploadConfirmOpen(false)}
              aria-label="닫기"
            />

            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                  <div className="text-base font-semibold text-[#F6F6F6]">
                    곡을 업로드하시겠습니까?
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadConfirmOpen(false)}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-6 py-5 text-sm text-[#F6F6F6]/70 leading-relaxed">
                  업로드된 곡은 다른 사용자에게 공개됩니다.
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadConfirmOpen(false)}
                    className="px-4 py-2 rounded-2xl text-sm text-[#F6F6F6] hover:bg-white/10 transition"
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    onClick={confirmUpload}
                    className="px-4 py-2 rounded-2xl text-sm font-semibold
                              bg-[#AFDEE2] text-[#1f1f1f] hover:bg-[#87B2B6] transition"
                  >
                    업로드
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
