// src/pages/ai/AiCreatePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import type { AiTrack } from "../../mocks/aiSongMock";

import { generateMusicAsync, getTaskStatus, convertPromptOnly } from "../../api/ai";
import { listAllAiMusic, getMusicDetail } from "../../api/music";
import { getBestAlbumCover } from "../../api/album";
import { getCurrentUserId } from "../../utils/auth";

import { Typewriter } from "../../components/Typewriter/Typewriter";
import { CursorStyle } from "../../components/Typewriter/types";

import {
  getPlaylistById,
  getUserPlaylists,
  subscribePlaylists,
  updatePlaylist,
} from "../../mocks/playlistMock";

import {
  MdSearch,
  MdPlaylistAdd,
  MdShare,
  MdMusicNote,
  MdAdd,
  MdOutlineNavigateNext,
} from "react-icons/md";
import { IoChevronBack, IoShuffle } from "react-icons/io5";

function PillButton({
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
      onClick={onClick}
      disabled={disabled}
      className="
        shrink-0 px-4 py-2 rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-500
        text-sm transition flex items-center gap-2
        disabled:text-white/30 disabled:cursor-not-allowed disabled:hover:bg-transparent
        hover:bg-[#f6f6f6]/10"
    >
      <span className="text-base">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function AiCreatePage() {
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [sp, setSp] = useSearchParams();
  const appliedRef = useRef(false);
  const backScrollRef = useRef<HTMLDivElement | null>(null);
  const backContentRef = useRef<HTMLDivElement | null>(null);
  const frontScrollRef = useRef<HTMLDivElement | null>(null);
  const frontContentRef = useRef<HTMLDivElement | null>(null);


  /** =========================
   * ✅ 커버 업로드
   ========================= */
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [coverUrl]);

  const onPickCover = () => {
    fileRef.current?.click();
  };

  const onCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있어요.");
      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("파일 용량은 5MB 이하로 업로드해 주세요.");
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setCoverUrl(url);
    e.target.value = "";
  };

  /** =========================
   * ✅ 좌측 입력
   ========================= */
  const [prompt, setPrompt] = useState("");
  const maxPrompt = 1500;
  const promptCardRef = useRef<HTMLDivElement | null>(null);

  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [convertedPrompt, setConvertedPrompt] = useState<string>("");
  const [displayText, setDisplayText] = useState<string>("");
  const [typewriterTrigger, setTypewriterTrigger] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const incoming = sp.get("prompt");
    if (!incoming) return;

    // 생성 중/완료 중이면 덮어쓰기 방지
    if (isGenerating || isCompleted) return;

    // 한번만 적용 (사용자가 수정하는 거 덮어쓰면 안 됨)
    if (appliedRef.current) return;
    appliedRef.current = true;

    setPrompt(incoming.slice(0, maxPrompt));

    // ✅ 시점 이동 (스크롤)
    requestAnimationFrame(() => {
      promptCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }); });

    // URL 깔끔하게 정리 (선택이지만 강추)
    sp.delete("prompt");
    setSp(sp, { replace: true });
  }, [sp, setSp, isGenerating, isCompleted, maxPrompt]);

  useEffect(() => {
    const scroller = backScrollRef.current;
    const content = backContentRef.current;
    if (!scroller || !content) return;
  
    const stickToBottom = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
  
    // 시작 시 한번
    stickToBottom();
  
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(stickToBottom);
    });
  
    ro.observe(content);
    return () => ro.disconnect();
  }, [typewriterTrigger, displayText]);
  
  useEffect(() => {
    const scroller = frontScrollRef.current;
    const content = frontContentRef.current;
    if (!scroller || !content) return;
  
    const stickToBottom = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
  
    stickToBottom();
  
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(stickToBottom);
    });
  
    ro.observe(content);
    return () => ro.disconnect();
  }, [prompt]);  


  // 사용자가 입력을 변경할 때 (변환 결과가 없을 때만 사용자 입력 표시)
  useEffect(() => {
    if (isGenerating) return;

    // 변환 결과가 있으면 유지
    if (convertedPrompt) return;

    // 생성 완료 상태일 때는 카드를 뒤집지 않음
    if (isCompleted) return;

    // 변환 결과가 없을 때 카드를 앞면으로
    setIsFlipped(false);

    // 변환 결과가 없을 때만 사용자 입력 표시
    if (prompt) setDisplayText(prompt);
    else setDisplayText("");
  }, [prompt, isGenerating, convertedPrompt, isCompleted]);

  // Typewriter 설정
  const typewriterConfig = {
    speed: 50,
    startDelay: 0,
    cursorChar: CursorStyle.Pipe,
    cursorBlinkSpeed: 0.8,
    smoothness: 0.3,
    loop: false,
  };

  /** =========================
   * ✅ 우측 리스트
   ========================= */
  const [query, setQuery] = useState("");
  const [allRows, setAllRows] = useState<AiTrack[]>([]); // 전체(검색용)
  const [rows, setRows] = useState<AiTrack[]>([]);       // 화면 기본(최신 200)
  const [listLoading, setListLoading] = useState(false);

  const formatDuration = (seconds: number): string => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatKoreanDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch {
      return dateString ?? "";
    }
  };

  useEffect(() => {
      const load = async () => {
        try {
          setListLoading(true);
    
          const allData = await listAllAiMusic({ is_ai: true });
          if (!allData || !Array.isArray(allData)) {
            setRows([]);
            setAllRows([]);
            return;
          }
    
          const validData = allData.filter((m) => m.duration != null && m.duration > 0);
    
          const uniqData = Array.from(
            new Map(validData.map((m) => [m.music_id, m])).values()
          );
    
          const sorted = [...uniqData].sort((a, b) => {
            const at = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bt - at;
          });
    
          // ✅ 전체(검색용)
          const allRaw = sorted;
    
          // ✅ 기본(화면 표시용): 최근 200개만
          const baseRaw = sorted.slice(0, 50);
    
          // ✅ 커버 + AiTrack 매핑 함수
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapOne = async (m: any): Promise<AiTrack> => {
            let coverUrl: string | undefined;
    
            try {
              const musicDetail = await getMusicDetail(m.music_id);
    
              if (musicDetail) {
                if (musicDetail.image_square) coverUrl = musicDetail.image_square;
                else if (musicDetail.image_large_square) coverUrl = musicDetail.image_large_square;
                else if (musicDetail.album_image) coverUrl = musicDetail.album_image;
                else if (musicDetail.album_id) {
                  const albumCover = await getBestAlbumCover(musicDetail.album_id, null);
                  coverUrl = albumCover || undefined;
                }
              }
            } catch {
              // ignore
            }
    
            return {
              musicId: m.music_id,
              status: (m.audio_url ? "Upload" : "Draft") as AiTrack["status"],
              title: m.music_name || "제목 없음",
              desc: m.lyrics || m.genre || "",
              duration: formatDuration(m.duration ?? 0),
              createdAt: m.created_at ? formatKoreanDate(m.created_at) : "",
              isAi: m.is_ai ?? true,
              artist: m.artist_name || "AI Artist",
              plays: 0,
              lyrics: m.lyrics || "",
              coverUrl,
              audioUrl: m.audio_url || undefined,
              prompt: "",
              ownerId: undefined,
              ownerName: undefined,
            };
          };
    
          // ✅ base(200개) 먼저 만들어서 빠르게 화면 표시
          const baseMapped = await Promise.all(baseRaw.map(mapOne));
          setRows(baseMapped);
    
          // ✅ 전체는 뒤에서 계속 로드(검색 정확도 위해)
          const allMapped = await Promise.all(allRaw.map(mapOne));
          setAllRows(allMapped);
    
        } catch {
          setRows([]);
          setAllRows([]);
        } finally {
          setListLoading(false);
        }
      };
    
      load();
    }, []);
  
  

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    // ✅ 검색어 없으면: 최신 200개(커버 있는 rows)
    if (!q) return rows;

    // ✅ 검색어 있으면: 전체(allRows)에서 검색
    const base = allRows;
    const result = base.filter(
      (r) => r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    );

    return result;
  }, [query, rows, allRows]);

  /** =========================
   * ✅ 선택 체크
   ========================= */
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visibleIds = useMemo(() => filtered.map((r) => r.musicId), [filtered]);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked = visibleIds.some((id) => selected.has(id)) && !allChecked;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  /** =========================
   * ✅ 생성: 실제 백엔드 API 호출
   ========================= */
  const handleCreateSong = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    const userId = getCurrentUserId();
    if (userId === null) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      setIsGenerating(true);
      setIsCompleted(false);
      setErrorMessage(null);
      setConvertedPrompt("");

      // ✅ 카드 뒷면으로 플립 + 로딩 텍스트 애니메이션
      setIsFlipped(true);
      setDisplayText("프롬프트 변환 중....\n잠시 기다려 주세요");
      setTypewriterTrigger((prev) => prev + 1);

      // 1) 프롬프트 변환
      const convertResponse = await convertPromptOnly({
        prompt: trimmed,
        make_instrumental: makeInstrumental,
      });

      // 변환된 프롬프트 파싱
      let finalConvertedPrompt = "";
      try {
        const parsed = JSON.parse(convertResponse.converted_prompt);
        finalConvertedPrompt = parsed?.prompt ? parsed.prompt : convertResponse.converted_prompt;
      } catch {
        finalConvertedPrompt = convertResponse.converted_prompt;
      }

      // 6초 대기 후 변환된 프롬프트를 카드에 표시
      await new Promise((resolve) => setTimeout(resolve, 6000));
      setConvertedPrompt(finalConvertedPrompt);
      setDisplayText(finalConvertedPrompt);
      setTypewriterTrigger((prev) => prev + 1);

      // 2) 음악 생성 요청
      const response = await generateMusicAsync({
        prompt: finalConvertedPrompt,
        user_id: userId,
        make_instrumental: makeInstrumental,
      });

      // 3) 작업 상태 폴링
      const pollTaskStatus = async (taskId: string) => {
        const maxAttempts = 120;
        let attempts = 0;

        const poll = async (): Promise<void> => {
          if (attempts >= maxAttempts) {
            setErrorMessage("음악 생성 시간이 초과되었습니다. 나중에 다시 확인해주세요.");
            setIsGenerating(false);
            return;
          }

          try {
            const status = await getTaskStatus(taskId);

            if (status.status === "SUCCESS" && status.result) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result: any = status.result as any;
              const musicIdFromResult = result?.music?.music_id ?? result?.music_id ?? null;

              if (!musicIdFromResult || !API_BASE) {
                setPrompt("");
                setConvertedPrompt("");
                setSelected(new Set());
                setDisplayText("생성이 완료되었습니다.\n생성곡 목록으로 넘어갑니다.");
                setTypewriterTrigger((prev) => prev + 1);
                setIsGenerating(false);
                setIsCompleted(true);

                setTimeout(() => navigate("/my/ai-songs"), 5000);
                return;
              }

              const musicId = musicIdFromResult as number;

              // ✅ 상세 폴링: audio_url 준비될 때까지
              const pollDetailMaxAttempts = 120;
              let detailAttempts = 0;

              const pollMusicDetail = async (): Promise<void> => {
                if (detailAttempts >= pollDetailMaxAttempts) {
                  setIsGenerating(false);
                  setDisplayText(
                    "AI 노래 생성은 완료되었지만,\n오디오 파일 준비에 시간이 더 걸리고 있습니다.\n나의 AI 생성곡 페이지에서 잠시 후 다시 확인해 주세요."
                  );
                  setTypewriterTrigger((prev) => prev + 1);
                  setTimeout(() => navigate("/my/ai-songs"), 5000);
                  return;
                }

                try {
                  const res = await fetch(`${API_BASE}/${musicId}/`);
                  if (!res.ok) {
                    detailAttempts++;
                    setTimeout(pollMusicDetail, 5000);
                    return;
                  }

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const data: any = await res.json();

                  const detailAudioUrl =
                    data?.audio_url ??
                    data?.audioUrl ??
                    data?.music?.audio_url ??
                    data?.music?.audioUrl ??
                    null;

                  if (!detailAudioUrl) {
                    detailAttempts++;
                    setTimeout(pollMusicDetail, 5000);
                    return;
                  }

                  setPrompt("");
                  setConvertedPrompt("");
                  setSelected(new Set());

                  setDisplayText("생성이 완료되었습니다.\n생성곡 목록으로 넘어갑니다.");
                  setTypewriterTrigger((prev) => prev + 1);
                  setIsGenerating(false);
                  setIsCompleted(true);

                  setTimeout(() => navigate("/my/ai-songs"), 5000);
                } catch {
                  detailAttempts++;
                  setTimeout(pollMusicDetail, 5000);
                }
              };

              pollMusicDetail();
              return;
            }

            if (status.status === "FAILURE") {
              setErrorMessage(status.error || "음악 생성에 실패했습니다. 다시 시도해주세요.");
              setIsGenerating(false);
              return;
            }

            attempts++;
            setTimeout(poll, 5000);
          } catch {
            attempts++;
            setTimeout(poll, 5000);
          }
        };

        poll();
      };

      pollTaskStatus(response.task_id);
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = error as any;
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        err?.message ||
        "AI 노래 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setErrorMessage(errorMsg);
      setIsGenerating(false);
    }
  };

  /** =========================
   * ✅ 선택된 row → PlayerTrack
   ========================= */
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.musicId)), [rows, selected]);

  const toTrack = (r: AiTrack): PlayerTrack => ({
    id: r.musicId.toString(),
    title: r.title,
    artist: r.artist ?? "AI Artist",
    duration: r.duration,
    audioUrl: r.audioUrl,
    musicId: r.musicId,
  });

  const selectedTracks = useMemo(() => selectedRows.map(toTrack), [selectedRows]);
  const selectedCount = selectedTracks.length;

  /** =========================
   * ✅ 담기 모달
   ========================= */
  const [addOpen, setAddOpen] = useState(false);
  const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

  useEffect(() => {
    const syncTargets = () => setAddTargets(getUserPlaylists());
    syncTargets();
    return subscribePlaylists(syncTargets);
  }, []);

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
    setSelected(new Set());
  };

  /** =========================
   * ✅ 공유
   ========================= */
  const shareSelected = async () => {
    if (selectedCount === 0) return;

    const text = selectedRows.map((r) => `- ${r.title} (${r.duration})`).join("\n");

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
      alert("선택한 곡 목록을 클립보드에 복사했어요!");
    } catch {
      alert("공유에 실패했어요. (클립보드 권한 확인)");
    }
  };

  type ActionKey = "play" | "shuffle" | "add" | "share";

  const handleAction = (key: ActionKey) => {
    if (selectedCount === 0) return;

    if (key === "play") playTracks(selectedTracks);
    if (key === "shuffle") playTracks(selectedTracks, { shuffle: true });
    if (key === "add") setAddOpen(true);
    if (key === "share") shareSelected();
  };

  const goToAlSongPage = (trackId: number) => {
    navigate(`/aisong/${trackId}`);
  };

  return (
    <div className="w-full h-full overflow-x-auto">
      <style>{`
        @keyframes aiGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-back-gradient {
            animation: none !important;
          }
        }

        /* 텍스트 선택 하이라이트 숨기기 */
        .ai-prompt-textarea::selection { background: transparent; }
        .ai-prompt-textarea::-moz-selection { background: transparent; }
      `}</style>

      <div className="grid h-[100dvh] items-stretch grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.05fr)] gap-6">
        {/* ===================== 좌측: 생성 폼 ===================== */}
        <section>
          {/* 상단: 뒤로가기 + 타이틀 */}
          <div className="flex pt-2 place-items-start">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
              className="p-2 text-[#f6f6f6] rounded-full hover:bg-white/10 transition"
            >
              <IoChevronBack size={22} />
            </button>

            <div className="flex-1 flex justify-center">
              <h1 className="mr-10 mt-10 text-3xl font-semibold leading-tight text-[#f6f6f6]">
                나만의 노래를
                <br />
                AI로 만들어보세요!
              </h1>
            </div>
          </div>

          {/* 커버 업로드 카드 */}
          <div className="mt-14 flex flex-col items-center">
            <button
              type="button"
              onClick={onPickCover}
              className="w-72 h-72 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.25)] bg-[#3d3d3d]/90 hover:bg-[#3d3d3d]/40 transition flex flex-col items-center justify-center overflow-hidden"
              aria-label="add cover"
            >
              {coverUrl ? (
                <img src={coverUrl} alt="cover preview" className="h-full w-full object-cover" />
              ) : (
                <>
                  <div className="text-[#f6f6f6]">
                    <MdAdd size={26} />
                  </div>
                  <span className="text-sm text-[#f6f6f6]">나만의 커버 사진 추가하기</span>
                </>
              )}
            </button>
          </div>

          <div>
            <p className="mt-2 text-[11px] text-center text-[#9d9d9d] leading-relaxed">
              커버 사진을 추가하지 않아도 AI가 자동으로 생성해줍니다.
            </p>
          </div>

          {/* 실제 업로드 input */}
          <input ref={fileRef} type="file" accept="image/*" onChange={onCoverChange} className="hidden" />

          {/* 프롬프트 카드 - 플립 애니메이션 */}
          <div 
            ref={promptCardRef}
            className="mt-10 mx-6 [perspective:1000px] h-[350px]">
            <div
              className={`relative w-full h-full transition-transform duration-600 ease-in-out [transform-style:preserve-3d] ${
                isFlipped ? "[transform:rotateY(180deg)]" : ""
              }`}
              style={{ transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            >
              {/* 앞면: 사용자 입력 */}
              <div
                className="
                  absolute inset-0 [backface-visibility:hidden]
                  rounded-2xl bg-[#3d3d3d]/80 backdrop-blur-xl
                  border border-[#3d3d3d]
                  shadow-[0_4px_12px_rgba(0,0,0,0.25)] p-5
                  overflow-hidden
                  
                  transition-all duration-200
                  border border-[#3d3d3d]
                  focus-within:ring-2 focus-within:ring-[#4d4d4d] focus-within:ring-offset-0
                  focus-within:shadow-[0_8px_20px_rgba(0,0,0,0.35)]
                  "
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="relative flex flex-col items-center justify-center min-h-full">
                  <div className="absolute top-2 left-2 text-xs text-white/40">
                    {prompt ? "사용자 입력" : "프롬프트 입력"}
                  </div>

                  {/* Typewriter 애니메이션 표시 영역 */}
                  <div 
                    ref={frontScrollRef}
                    className="relative w-full flex flex-col items-center justify-center min-h-[250px] max-h-[250px] overflow-y-auto">
                    {prompt ? (
                      <div
                        ref={frontContentRef}
                        className="
                          w-full flex flex-col text-lg
                          items-center justify-center
                          whitespace-pre-wrap break-words
                          leading-relaxed px-4"
                      >
                        <Typewriter text={prompt} config={typewriterConfig} triggerReplay={0} />
                      </div>
                    ) : (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#777777] text-base text-center w-full">
                        예) 새벽 감성, 로파이 힙합, 한국어 보컬...
                      </div>
                    )}
                  </div>

                  {/* 실제 입력을 받는 textarea */}
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      const newValue = e.target.value.slice(0, maxPrompt);
                      setPrompt(newValue);
                    }}
                    placeholder="예) 새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬..."
                    className="
                      ai-prompt-textarea absolute
                      inset-0 w-full h-full resize-none
                      bg-transparent text-lg text-transparent
                      outline-none placeholder:text-transparent
                      font-bold leading-relaxed text-center
                      overflow-y-auto
                    "
                    style={
                      {
                        caretColor: "transparent",
                        zIndex: 10,
                        pointerEvents: "auto",
                      } as CSSProperties
                    }
                    disabled={isGenerating}
                  />

                  {/* 글자 수 표시 */}
                  <div className="absolute bottom-2 right-2 text-right text-xs text-[#888888] z-20">
                    {prompt.length}/{maxPrompt}
                  </div>
                </div>
              </div>

              {/* 뒷면: 변환 결과 */}
              <div
                className="ai-back-gradient absolute inset-0 [backface-visibility:hidden] rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-5 overflow-hidden [transform:rotateY(180deg)]"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundImage:
                    "radial-gradient(1200px circle at 10% 20%, rgba(107,115,255,0.35), transparent 45%), radial-gradient(900px circle at 85% 25%, rgba(175,222,226,0.30), transparent 50%), radial-gradient(900px circle at 40% 85%, rgba(255,89,169,0.22), transparent 55%), linear-gradient(135deg, rgba(18,18,18,0.90), rgba(28,28,28,0.92))",
                  backgroundSize: "200% 200%",
                  animation: "aiGradientShift 12s ease-in-out infinite",
                }}
              >
                <div className="relative flex flex-col items-center justify-center h-full min-h-0">
                  <div className="absolute top-2 left-2 text-xs text-white/40">
                    {isGenerating && !convertedPrompt ? "생성 중..." : convertedPrompt ? "변환 결과" : ""}
                  </div>

                  <div
                    ref={backScrollRef}
                    className={[
                      "relative w-full flex flex-col min-h-[300px] max-h-[320px] overflow-y-auto px-4",
                      isGenerating && !convertedPrompt
                        ? "items-center justify-center text-center"
                        : "items-center justify-start pt-[40px]",
                    ].join(" ")}
                  >
                    {displayText ? (
                      <div 
                        ref={backContentRef}
                        className="whitespace-pre-wrap break-words leading-snug">
                        <Typewriter
                          text={displayText}
                          config={typewriterConfig}
                          triggerReplay={typewriterTrigger}
                        />
                      </div>
                    ) : (
                      <div className="text-[#AFDEE2]/40 text-2xl text-center">
                        {isGenerating ? "잠시만 기다려 주세요..." : "변환 결과가 여기에 표시됩니다"}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* make_instrumental 체크박스 */}
          <label className="mt-4 mx-6 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-[#f6f6f6] cursor-pointer">
            <input
              type="checkbox"
              checked={makeInstrumental}
              onChange={(e) => setMakeInstrumental(e.target.checked)}
              disabled={isGenerating}
              className="accent-[#AFDEE2] cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-[#f6f6f6]/50">보컬 없이 연주곡(Instrumental)으로 만들기</span>
          </label>

          {/* 버튼들 */}
          <div className="mt-6 mb-10 flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={!prompt.trim() || isGenerating}
              onClick={handleCreateSong}
              className="
                px-4 py-3
                rounded-2xl
                text-sm
                bg-[#AFDEE2]
                text-[#1f2a2b]
                hover:bg-[#87B2B6]
                active:scale-[0.97]
                transition
                disabled:bg-[#5f7f83]
                disabled:text-[#cfd8da]
                disabled:cursor-not-allowed
                disabled:active:scale-100"
            >
              <div className="flex gap-2 items-center">
                {isGenerating ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </span>
                ) : (
                  <MdMusicNote size={18} />
                )}
                <span className="whitespace-nowrap">
                  {isGenerating ? "AI 노래 생성 중..." : isCompleted ? "생성 완료" : "AI 노래 생성하기"}
                </span>
              </div>
            </button>

            {errorMessage && <p className="text-center text-xs text-red-400 max-w-[300px]">{errorMessage}</p>}
          </div>
        </section>

        {/* ===================== 우측: 리스트/테이블 ===================== */}
        <section
          className="
            relative min-h-0 flex flex-col
            rounded-2xl bg-[#2d2d2d]/80 bg-gradient-to-tr
            shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-[#2d2d2d]
            overflow-hidden text-[#f6f6f6] mb-4
          "
        >
          <div className="px-8 py-6 border-b border-[#464646]">
            {/* 검색바 */}
            <div className="flex items-center gap-3 rounded-full bg-[#3d3d3d] px-4 py-2 text-[#666666]">
              <MdSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="AI 곡 검색하기"
                className="w-full bg-transparent text-[#f6f6f6] text-sm outline-none placeholder:text-[#666666]"
              />
            </div>

            {/* 액션 버튼들 */}
            <div className="mt-4 flex items-center justify-between gap-4 text-[#f6f6f6]">
              <div className="flex flex-nowrap gap-3">
                <PillButton icon={<MdMusicNote />} label="재생" onClick={() => handleAction("play")} disabled={selectedCount === 0} />
                <PillButton icon={<IoShuffle />} label="셔플" onClick={() => handleAction("shuffle")} disabled={selectedCount === 0} />
                <PillButton icon={<MdPlaylistAdd />} label="담기" onClick={() => handleAction("add")} disabled={selectedCount === 0} />
                <PillButton icon={<MdShare />} label="공유" onClick={() => handleAction("share")} disabled={selectedCount === 0} />
              </div>

              <button
                type="button"
                onClick={() => navigate("/my/ai-songs")}
                className="
                  shrink-0 flex items-center text-sm font-semibold
                  text-[#F6F6F6]/80 hover:text-white transition
                "
                aria-label="나의 AI 생성곡 목록으로 이동"
                title="나의 AI 생성곡 목록"
              >
                나의 AI 생성곡
                <MdOutlineNavigateNext size={24} className="translate-y-[1px] opacity-80 group-hover:opacity-100 transition" />
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div 
            ref={listScrollRef}
            onScroll={(e) => {
              setShowScrollTop(e.currentTarget.scrollTop > 300);
            }}
            className="mt-0 flex-1 min-h-0 overflow-y-auto">
            <div className="grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-3 text-[12px] text-white/55">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={toggleAllVisible}
                aria-label="select all"
                className="ml-2 accent-[#f6f6f6]"
              />

              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">곡정보</div>
              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">길이</div>
              <div className="pr-2 border-r border-[#E6E6E6]/20 text-[#f6f6f6] text-right">생성 일시</div>
            </div>

            <div className="border-b border-[#464646]" />

            {listLoading ? (
              <div className="px-8 py-10 text-center text-sm text-[#f6f6f6] whitespace-normal">불러오는 중...</div>
            ) : (
              <>
                <div className="divide-y divide-[#464646]">
                  {filtered.map((r, idx) => (
                    <div
                      key={r.musicId}
                      className={[
                        "grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-2 transition group",
                        idx % 2 === 0 ? "bg-[#2d2d2d]/80" : "bg-[#3b3b3b]/80",
                        "hover:bg-white/5",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.musicId)}
                        onChange={() => toggleOne(r.musicId)}
                        aria-label={`select ${r.title}`}
                        className="ml-2 accent-[#f6f6f6]"
                      />

                      <div className="pl-2 border-l border-[#E6E6E6]/20 min-w-0 flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-xl bg-white/20 shrink-0 overflow-hidden">
                          {r.coverUrl ? <img src={r.coverUrl} alt={r.title} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => goToAlSongPage(r.musicId)}
                            className="block w-full truncate text-left text-[12px] text-[#f6f6f6] hover:underline underline-offset-2"
                          >
                            {r.title}
                          </button>
                          <div className="truncate text-[12px] text-[#999999]">{r.desc}</div>
                        </div>
                      </div>

                      <div className="pl-2 border-l border-[#E6E6E6]/20 text-left text-xs text-[#f6f6f6]">{r.duration}</div>

                      <div className="pr-2 border-r border-[#E6E6E6]/20 text-right text-xs text-[#f6f6f6]">{r.createdAt}</div>
                    </div>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="px-8 py-10 text-center text-sm text-[#f6f6f6] whitespace-normal">
                    {query}에 대한 검색 결과가 없습니다.
                  </div>
                )}
              </>
            )}
          </div>

          {showScrollTop && (
            <button
              type="button"
              onClick={() => {
                listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="
                absolute w-10 h-10 text-center bottom-6 right-6 z-20
                rounded-full bg-[#AFDEE2]/50 text-[#2d2d2d]
                shadow-lg hover:bg-[#87B2B6]/50
                active:scale-95 transition
              "
              aria-label="목록 맨 위로"
              title="맨 위로"
            >
              ↑
            </button>
          )}

        </section>

        {/* ✅ 담기 모달 */}
        {addOpen && (
          <div className="fixed inset-0 z-[999] whitespace-normal">
            <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setAddOpen(false)} aria-label="닫기" />
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                  <div className="text-base font-semibold text-[#F6F6F6]">플레이리스트 선택</div>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요</div>

                <div className="max-h-[360px] overflow-y-auto border-t border-[#464646]">
                  {addTargets.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-[#aaa]">
                      담을 수 있는 플레이리스트가 없어요.
                      <div className="mt-2 text-xs text-[#777]">(liked 같은 시스템 플리는 제외됨)</div>
                    </div>
                  ) : (
                    addTargets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addSelectedToPlaylist(p.id)}
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                      >
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">{p.title}</div>
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
      </div>
    </div>
  );
}
