import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import {
  getAllAiSongs,
  subscribeAiSongs,
} from "../../mocks/aiSongMock";
import type { AiTrack } from "../../mocks/aiSongMock";
import { generateMusicAsync, getTaskStatus, convertPromptOnly } from "../../api/ai";
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
  icon: React.ReactNode;
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

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // 생성 완료 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [convertedPrompt, setConvertedPrompt] = useState<string>(""); // 라마에서 변환된 프롬프트
  const [displayText, setDisplayText] = useState<string>(""); // 카드에 보여줄 텍스트(애니메이션용)
  const [typewriterTrigger, setTypewriterTrigger] = useState(0); // Typewriter 애니메이션 재생용
  const [isFlipped, setIsFlipped] = useState(false); // 카드 플립 상태

  // 사용자가 입력을 변경할 때 (변환 결과가 없을 때만 사용자 입력 표시)
  useEffect(() => {
    if (isGenerating) return;
    
    // 변환 결과가 있으면 유지 (변환 결과를 표시)
    if (convertedPrompt) {
      return;
    }
    
    // 생성 완료 상태일 때는 카드를 뒤집지 않음
    if (isCompleted) {
      return;
    }
    
    // 변환 결과가 없을 때 카드를 앞면으로
    setIsFlipped(false);
    
    // 변환 결과가 없을 때만 사용자 입력 표시
    if (prompt) {
      setDisplayText(prompt);
    } else {
      setDisplayText("");
    }
  }, [prompt, isGenerating, convertedPrompt, isCompleted]);
  // Typewriter 설정
  const typewriterConfig = {
    speed: 50, // 애니메이션 속도 빠르게 (100 -> 50ms)
    startDelay: 0,
    cursorChar: CursorStyle.Pipe,
    cursorBlinkSpeed: 0.8,
    smoothness: 0.3, // 빠른 타이핑 효과
    loop: false,
  };

  /** =========================
   * ✅ 우측 리스트(업로드된 곡만)
   ========================= */
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AiTrack[]>([]);

  useEffect(() => {
    const sync = () => setRows(getAllAiSongs());
    sync();
    return subscribeAiSongs(sync);
  }, []);

  const filtered = useMemo(() => {
    const uploaded = rows.filter((r) => r.status === "Upload");

    const q = query.trim().toLowerCase();
    if (!q) return uploaded;

    return uploaded.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q)
    );
  }, [query, rows]);

  /** =========================
   * ✅ 선택 체크
   ========================= */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allChecked =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked =
    visibleIds.some((id) => selected.has(id)) && !allChecked;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleOne = (id: string) => {
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
    if (!trimmed || isGenerating) {
      console.log("[AICreatePage] 🚫 handleCreateSong 호출 무시", {
        trimmedLength: trimmed.length,
        isGenerating,
      });
      return;
    }

    const userId = getCurrentUserId();
    if (userId === null) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      console.log("[AICreatePage] ▶️ AI 노래 생성 시작", {
        promptPreview: trimmed.slice(0, 80),
        makeInstrumental,
      });
      setIsGenerating(true);
      setIsCompleted(false);
      setErrorMessage(null);
      setConvertedPrompt(""); // 이전 변환 결과 제거

      // ✅ 카드 뒷면으로 플립 + 로딩 텍스트 애니메이션
      setIsFlipped(true);
      setDisplayText("프롬프트 변환 중....\n잠시 기다려 주세요");
      setTypewriterTrigger((prev) => prev + 1);

      // 1. 라마 프롬프트 변환 API 호출
      console.log("[AICreatePage] 🦙 라마 프롬프트 변환 API 호출 시작", {
        prompt: trimmed,
        makeInstrumental: makeInstrumental
      });

      const convertResponse = await convertPromptOnly({
        prompt: trimmed,
        make_instrumental: makeInstrumental,
      });

      console.log("[AICreatePage] ✅ 라마 프롬프트 변환 완료:", convertResponse);

      // 변환된 프롬프트 파싱 (아직 카드에 표시하지 않음)
      let finalConvertedPrompt = "";
      try {
        const parsed = JSON.parse(convertResponse.converted_prompt);
        console.log("[AICreatePage] 🔍 JSON 파싱 성공:", parsed);

        if (parsed.prompt) {
          console.log("[AICreatePage] ✅ 추출된 prompt:", parsed.prompt);
          finalConvertedPrompt = parsed.prompt;
        } else {
          console.log("[AICreatePage] ⚠️ parsed.prompt 없음, 전체 객체 사용");
          finalConvertedPrompt = convertResponse.converted_prompt;
        }
      } catch (error) {
        console.log("[AICreatePage] ⚠️ JSON 파싱 실패 - 일반 문자열로 처리");
        finalConvertedPrompt = convertResponse.converted_prompt;
      }

      // ✅ 10초 대기 후 변환된 프롬프트를 카드에 표시
      console.log("[AICreatePage] ⏳ 10초 대기 시작 (변환 결과 표시 전)");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      setConvertedPrompt(finalConvertedPrompt);
      setDisplayText(finalConvertedPrompt);
      setTypewriterTrigger((prev) => prev + 1);
      console.log("[AICreatePage] ✍️ 카드에 변환된 프롬프트 표시 완료 (10초 대기 후)");

      // 2. 변환된 프롬프트로 Suno 음악 생성 API 호출
      console.log("[AICreatePage] 🎵 Suno 음악 생성 API 호출 시작", {
        convertedPrompt: finalConvertedPrompt,
        userId: userId,
        makeInstrumental: makeInstrumental
      });

      const response = await generateMusicAsync({
        prompt: finalConvertedPrompt, // 변환된 프롬프트 사용
        user_id: userId,
        make_instrumental: makeInstrumental,
      });

      console.log("[AICreatePage] 📦 Suno 생성 API 응답:", response);
      console.log("[AICreatePage] 🆔 작업 ID:", response.task_id);

      // 2. 작업 상태 폴링 시작
      const pollTaskStatus = async (taskId: string) => {
        const maxAttempts = 120; // 최대 10분 (5초 * 120)
        let attempts = 0;

        const poll = async (): Promise<void> => {
          console.log("[AICreatePage] 🔁 작업 상태 폴링 시도", {
            taskId,
            attempts,
            maxAttempts,
          });
          if (attempts >= maxAttempts) {
            setErrorMessage("음악 생성 시간이 초과되었습니다. 나중에 다시 확인해주세요.");
            setIsGenerating(false);
            console.log("[AICreatePage] ⏱️ 폴링 타임아웃 - 생성 종료");
            return;
          }

          try {
            const status = await getTaskStatus(taskId);
            console.log("[AICreatePage] 📊 작업 상태 조회 결과:", status);
            console.log("[AICreatePage] 📋 상태 응답 키 목록:", Object.keys(status));
            
            // 변환된 프롬프트는 이미 카드에 표시되어 있으므로, 여기서는 상태만 확인
            if (status.converted_prompt) {
              console.log("[AICreatePage] ℹ️ 작업 상태에 converted_prompt 포함됨 (이미 표시 완료)");
            }

            if (status.status === "SUCCESS" && status.result) {
              // 1차: 작업 자체는 SUCCESS → 이제 music_id 기준으로 상세 조회를 폴링
              const result: any = status.result as any;
              const musicIdFromResult =
                result?.music?.music_id ?? result?.music_id ?? null;

              console.log("[AICreatePage] ✅ 작업 SUCCESS, music_id 추출", {
                musicIdFromResult,
                resultKeys: Object.keys(result),
              });

              if (!musicIdFromResult || !API_BASE) {
                console.log("[AICreatePage] ⚠️ music_id 또는 API_BASE 없음, 기존 로직으로 즉시 완료 처리", {
                  musicIdFromResult,
                  API_BASE_PRESENT: !!API_BASE,
                });

                // 폴백: 기존 SUCCESS 처리 (audio_url 여부는 신뢰하지 않고 바로 완료)
                setPrompt("");
                setConvertedPrompt("");
                setSelected(new Set());
                setDisplayText("생성이 완료되었습니다.\n생성곡 목록으로 넘어갑니다.");
                setTypewriterTrigger((prev) => prev + 1);
                setIsGenerating(false);
                setIsCompleted(true);

                const delayMs = 5000;
                setTimeout(() => {
                  navigate("/my/ai-songs");
                }, delayMs);
                return;
              }

              const musicId = musicIdFromResult as number;

              // ✅ 2차 폴링: /alsong/{musicId} 상세 조회에서 audio_url이 생길 때까지 대기
              const pollDetailMaxAttempts = 120;
              let detailAttempts = 0;

              const pollMusicDetail = async (): Promise<void> => {
                console.log("[AICreatePage] 🔁 상세 정보 폴링 시도", {
                  musicId,
                  detailAttempts,
                  pollDetailMaxAttempts,
                  detailUrl: API_BASE ? `${API_BASE}/${musicId}/` : null,
                });

                if (detailAttempts >= pollDetailMaxAttempts) {
                  console.log("[AICreatePage] ⏱️ 상세 정보 폴링 타임아웃, audio_url 없이 종료", {
                    musicId,
                  });

                  setIsGenerating(false);
                  setDisplayText(
                    "AI 노래 생성은 완료되었지만,\n오디오 파일 준비에 시간이 더 걸리고 있습니다.\n나의 AI 생성곡 페이지에서 잠시 후 다시 확인해 주세요."
                  );
                  setTypewriterTrigger((prev) => prev + 1);

                  setTimeout(() => navigate("/my/ai-songs"), 5000);
                  return;
                }

                try {
                  // ⚠️ 백엔드 스펙: GET /api/v1/{music_id}/ 로 조회
                  const res = await fetch(`${API_BASE}/${musicId}/`);
                  if (!res.ok) {
                    console.log("[AICreatePage] ⚠️ 상세 조회 응답 오류", {
                      musicId,
                      status: res.status,
                    });
                    detailAttempts++;
                    setTimeout(pollMusicDetail, 5000);
                    return;
                  }

                  const data: any = await res.json();

                  // 백엔드 상세 응답 스펙에 맞춰 audio_url 경로 확인
                  const detailAudioUrl =
                    data?.audio_url ??
                    data?.audioUrl ??
                    data?.music?.audio_url ??
                    data?.music?.audioUrl ??
                    null;

                  console.log("[AICreatePage] 🔍 상세 정보 조회 결과", {
                    musicId,
                    hasAudioUrl: !!detailAudioUrl,
                    detailAudioUrl,
                    dataKeys: Object.keys(data ?? {}),
                  });

                  if (!detailAudioUrl) {
                    detailAttempts++;
                    setTimeout(pollMusicDetail, 5000);
                    return;
                  }

                  // ✅ audio_url까지 준비 완료 → 최종 완료 처리
                  console.log("[AICreatePage] ✅ audio_url 확인, 최종 완료", {
                    musicId,
                    detailAudioUrl,
                  });

                  setPrompt("");
                  setConvertedPrompt("");
                  setSelected(new Set());

                  setDisplayText(
                    "생성이 완료되었습니다.\n생성곡 목록으로 넘어갑니다."
                  );
                  setTypewriterTrigger((prev) => prev + 1);
                  setIsGenerating(false);
                  setIsCompleted(true);

                  const delayMs = 5000;
                  console.log("[AICreatePage] ⏳ 5초 후 생성곡 목록으로 이동 예약", {
                    delayMs,
                  });

                  setTimeout(() => {
                    navigate("/my/ai-songs");
                  }, delayMs);
                } catch (detailError) {
                  console.log("[AICreatePage] ⚠️ 상세 정보 조회 실패, 재시도 예정", {
                    musicId,
                    error: detailError,
                  });
                  detailAttempts++;
                  setTimeout(pollMusicDetail, 5000);
                }
              };

              // task SUCCESS를 받았으니, 이제 상태 폴링은 멈추고 상세 폴링으로 전환
              pollMusicDetail();
              return;
            } else if (status.status === "FAILURE") {
              // 생성 실패
              console.log("[AICreatePage] ❌ 작업 상태 FAILURE", {
                taskId,
                status,
              });
              setErrorMessage(
                status.error || "음악 생성에 실패했습니다. 다시 시도해주세요."
              );
              setIsGenerating(false);
              console.log("[AICreatePage] ✅ isGenerating=false (FAILURE)");
            } else {
              // 아직 진행 중 (PENDING, STARTED 등)
              attempts++;
              console.log("[AICreatePage] ⏳ 작업 진행 중, 재시도 예약", {
                taskId,
                attempts,
                nextPollInMs: 5000,
                status: status.status,
              });
              setTimeout(poll, 5000); // 5초 후 다시 확인
            }
          } catch (error) {
            console.error("[작업 상태 조회 실패]", error);
            attempts++;
            console.log("[AICreatePage] ⚠️ 작업 상태 조회 실패, 재시도 예약", {
              taskId,
              attempts,
              nextPollInMs: 5000,
            });
            setTimeout(poll, 5000);
          }
        };

        console.log("[AICreatePage] ▶️ 작업 상태 폴링 시작", { taskId });
        poll();
      };

      // 폴링 시작
      pollTaskStatus(response.task_id);
    } catch (error: any) {
      console.error("[AI 음악 생성 실패]", error);
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        error?.message ||
        "AI 노래 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setErrorMessage(errorMsg);
      setIsGenerating(false);
      console.log("[AICreatePage] ❌ AI 노래 생성 실패, isGenerating=false", {
        error: errorMsg,
      });
    }
  };

  /** =========================
   * ✅ 선택된 row → PlayerTrack
   ========================= */
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected]
  );

  const toTrack = (r: AiTrack): PlayerTrack => ({
    id: r.id,
    title: r.title,
    artist: "AI Artist",
    duration: r.duration,
    audioUrl: "/audio/sample.mp3",
  });

  const selectedTracks = useMemo(
    () => selectedRows.map(toTrack),
    [selectedRows]
  );

  const selectedCount = selectedTracks.length;

  /** =========================
   * ✅ 담기 모달 (중복 선언 제거 완료)
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

    const text = selectedRows
      .map((r) => `- ${r.title} (${r.duration})`)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI 곡 공유",
          text,
        });
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

  const goToAlSongPage = (trackId: string) => {
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
      `}</style>
      <div className="grid min-h-screen items-stretch grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.05fr)] gap-6">
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
                <img
                  src={coverUrl}
                  alt="cover preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="text-[#f6f6f6]">
                    <MdAdd size={26} />
                  </div>
                  <span className="text-sm text-[#f6f6f6]">
                    나만의 커버 사진 추가하기
                  </span>
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onCoverChange}
            className="hidden"
          />

          {/* 프롬프트 카드 - 플립 애니메이션 */}
          <div className="mt-10 mx-4 [perspective:1000px] h-[350px]">
            <div 
              className={`relative w-full h-full transition-transform duration-600 ease-in-out [transform-style:preserve-3d] ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {/* 앞면: 사용자 입력 */}
              <div 
                className="absolute inset-0 [backface-visibility:hidden] rounded-2xl bg-[#3d3d3d]/80 backdrop-blur-xl border border-[#3d3d3d] shadow-[0_4px_12px_rgba(0,0,0,0.25)] p-5"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="relative flex flex-col items-center justify-center min-h-full">
                  <div className="absolute top-4 left-4 text-xs text-white/40">
                    {prompt ? "사용자 입력" : ""}
                  </div>
                  
                  {/* Typewriter 애니메이션 표시 영역 */}
                  <div className="relative w-full flex flex-col items-center justify-center min-h-[300px]">
                    {prompt ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <Typewriter
                          text={prompt}
                          config={typewriterConfig}
                          triggerReplay={0}
                        />
                      </div>
                    ) : (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#777777] text-2xl text-center w-full">
                        예) 새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬...
                      </div>
                    )}
                  </div>
                  
                  {/* 실제 입력을 받는 textarea */}
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      const newValue = e.target.value.slice(0, maxPrompt);
                      console.log('[AICreatePage] ⌨️ Textarea onChange', {
                        oldValue: prompt,
                        newValue: newValue,
                        length: newValue.length
                      });
                      setPrompt(newValue);
                    }}
                    placeholder="예) 새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬..."
                    className="absolute inset-0 w-full h-full resize-none bg-transparent text-4xl text-transparent outline-none placeholder:text-transparent font-bold leading-relaxed text-center"
                    style={{ 
                      caretColor: 'transparent',
                      zIndex: 10,
                      pointerEvents: 'auto'
                    } as React.CSSProperties}
                    disabled={isGenerating}
                  />
                  
                  {/* 글자 수 표시 */}
                  <div className="absolute bottom-4 right-4 text-right text-sm text-[#888888] z-20">
                    {prompt.length}/{maxPrompt}
                  </div>
                </div>
              </div>

              {/* 뒷면: 변환 결과 */}
              <div 
                className="ai-back-gradient absolute inset-0 [backface-visibility:hidden] rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-5 [transform:rotateY(180deg)]"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundImage:
                    "radial-gradient(1200px circle at 10% 20%, rgba(107,115,255,0.35), transparent 45%), radial-gradient(900px circle at 85% 25%, rgba(175,222,226,0.30), transparent 50%), radial-gradient(900px circle at 40% 85%, rgba(255,89,169,0.22), transparent 55%), linear-gradient(135deg, rgba(18,18,18,0.90), rgba(28,28,28,0.92))",
                  backgroundSize: "200% 200%",
                  animation: "aiGradientShift 12s ease-in-out infinite",
                }}
              >
                <div className="relative flex flex-col items-center justify-center min-h-full">
                  <div className="absolute top-4 left-4 text-xs text-white">
                    {isGenerating && !convertedPrompt ? "생성 중..." : convertedPrompt ? "변환 결과" : ""}
                  </div>
                  
                  {/* Typewriter 애니메이션 표시 영역 */}
                  <div className="relative w-full flex flex-col items-center justify-start pt-20 min-h-[300px]">
                    {displayText ? (
                      <div className="w-full flex flex-col items-center justify-center px-4">
                        <Typewriter
                          text={displayText}
                          config={typewriterConfig}
                          triggerReplay={typewriterTrigger}
                        />
                      </div>
                    ) : (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#AFDEE2]/40 text-2xl text-center w-full px-4">
                        {isGenerating ? "잠시만 기다려 주세요..." : "변환 결과가 여기에 표시됩니다"}
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
            </div>
          </div>

          {/* make_instrumental 체크박스 */}
          <label className="mt-4 mx-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-[#f6f6f6] cursor-pointer">
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
          <div className="mt-6 mb-4 flex flex-col items-center gap-3">
            {/* AI 노래 생성 버튼 */}
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
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </span>
                ) : (
                  <MdMusicNote size={18} />
                )}
                <span className="whitespace-nowrap">
                  {isGenerating
                    ? "AI 노래 생성 중..."
                    : isCompleted
                    ? "생성 완료"
                    : "AI 노래 생성하기"}
                </span>
              </div>
            </button>
            {errorMessage && (
              <p className="text-center text-xs text-red-400 max-w-[300px]">
                {errorMessage}
              </p>
            )}
          </div>
        </section>

        {/* ===================== 우측: 리스트/테이블 ===================== */}
        <section className="
            -mb-24 rounded-2xl bg-[#2d2d2d]/80 bg-gradient-to-tr
            shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-[#2d2d2d] overflow-hidden text-[#f6f6f6]">
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
                <PillButton
                  icon={<MdMusicNote />}
                  label="재생"
                  onClick={() => handleAction("play")}
                  disabled={selectedCount === 0}
                />
                <PillButton
                  icon={<IoShuffle />}
                  label="셔플"
                  onClick={() => handleAction("shuffle")}
                  disabled={selectedCount === 0}
                />
                <PillButton
                  icon={<MdPlaylistAdd />}
                  label="담기"
                  onClick={() => handleAction("add")}
                  disabled={selectedCount === 0}
                />
                <PillButton
                  icon={<MdShare />}
                  label="공유"
                  onClick={() => handleAction("share")}
                  disabled={selectedCount === 0}
                />
              </div>

              {/* 오른쪽 끝: 목록 이동 */}
              <button
                type="button"
                onClick={() => navigate("/my/ai-songs")}
                className="
                  shrink-0
                  flex items-center
                  text-sm font-semibold
                  text-[#F6F6F6]/80
                  hover:text-white
                  transition
                "
                aria-label="나의 AI 생성곡 목록으로 이동"
                title="나의 AI 생성곡 목록"
              >
                나의 AI 생성곡
                <MdOutlineNavigateNext
                  size={24}
                  className="translate-y-[1px] opacity-80 group-hover:opacity-100 transition"
                />
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="mt-0">
            <div className="grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-3 text-[12px] text-white/55">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={toggleAllVisible}
                aria-label="select all"
                className="ml-2 accent-[#f6f6f6]"
              />

              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">
                곡정보
              </div>
              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">
                길이
              </div>
              <div className="pr-2 border-r border-[#E6E6E6]/20 text-[#f6f6f6] text-right">
                생성 일시
              </div>
            </div>

            <div className="border-b border-[#464646]" />

            <div className="divide-y divide-[#464646]">
              {filtered.map((r, idx) => (
                <div
                  key={r.id}
                  className={[
                    "grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-2 transition group",
                    idx % 2 === 0 ? "bg-[#2d2d2d]/80" : "bg-[#3b3b3b]/80",
                    "hover:bg-white/5",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`select ${r.title}`}
                    className="ml-2 accent-[#f6f6f6]"
                  />

                  <div className="pl-2 border-l border-[#E6E6E6]/20 min-w-0 flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-xl bg-white/20 shrink-0" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => goToAlSongPage(r.id)}
                        className="block w-full truncate text-left text-[12px] text-[#f6f6f6] hover:underline underline-offset-2"
                      >
                        {r.title}
                      </button>
                      <div className="truncate text-[12px] text-[#999999]">
                        {r.desc}
                      </div>
                    </div>
                  </div>

                  <div className="pl-2 border-l border-[#E6E6E6]/20 text-left text-xs text-[#f6f6f6]">
                    {r.duration}
                  </div>

                  <div className="pr-2 border-r border-[#E6E6E6]/20 text-right text-xs text-[#f6f6f6]">
                    {r.createdAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="px-8 py-10 text-center text-sm text-[#f6f6f6] whitespace-normal">
              {query}에 대한 검색 결과가 없습니다.
            </div>
          )}
        </section>

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
      </div>
    </div>
  );
}
