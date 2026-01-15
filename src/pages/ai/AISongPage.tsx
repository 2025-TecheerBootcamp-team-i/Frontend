import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MdArrowBackIosNew,
  MdPlayArrow,
  MdShare,
  MdAdd,
  MdFavoriteBorder,
  MdFileUpload,
  MdContentCopy,
} from "react-icons/md";

type AiTrack = {
  id: string;
  status: "Upload" | "Draft";
  title: string;
  desc: string;
  duration: string;
  createdAt: string;
  isAi: boolean;
  artist: string;
  // genre: string;
  plays: number;
  lyrics: string;

  // (옵션) 상세 페이지에서 쓰고 싶으면 추가
  coverUrl?: string;   // 커버 이미지 URL
  audioUrl?: string;   // 오디오 URL
  prompt?: string;     // 생성 프롬프트
};

// ✅ (1) 더미 데이터: AiCreatePage에서 쓰던 값과 비슷하게 맞춤
const DUMMY_TRACKS: AiTrack[] = [
  {
    id: "t1",
    status: "Upload",
    title: "테커의 새벽",
    desc: "rap, Boom-bap inspired hip-hop with crisp drums, round bass, and warm synth pads over a steady 110 groove, Piano chords punctuate the pocket while male vocals deliver storytelling verses up front",
    duration: "2:27",
    createdAt: "2026년 1월 10일",
    isAi: true,
    artist: "Andrew Park",
    // genre: "Hip-Hop/Rap",
    plays: 100,
    lyrics: `[Verse 1]\n퇴근 시간 한참 전에\n우리 하루 이제 시작\n모니터 불빛 아래\n눈은 빨갛지만 입꼬린 살아 있어\n\n커피 줄 서 있는 사이에러 메시지 또 뜨네\n“이건 어제도 봤는데”\n웃으면서 다시 로그를 따라가\n\n[Chorus]`,
    prompt: "새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬...",
  },
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `t${i + 2}`,
    status: "Draft" as const,
    title: "곡 이름",
    desc: "곡 설명",
    duration: "2:27",
    createdAt: "2026년 1월 10일",
    isAi: true,
    artist: "Unknown",
    // genre: "AI Generated",
    plays: 0,
    lyrics: "가사가 아직 없습니다.",
    prompt: "예시 프롬프트",
  })),
];


function ActionSquare({
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
        h-9 w-9 rounded-lg
        inline-flex items-center justify-center
        transition
        ${disabled
        ? "bg-[#555555] text-[#999999] cursor-not-alloed"
        : "bg-[#777777] hover:bg-white/25 text-[#d9d9d9]"}
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
  // 예: .env에 VITE_API_BASE_URL="https://api.example.com" 넣으면 API 모드로 동작

  const [track, setTrack] = useState<AiTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 곡 정보에서 바로 제목 편집
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // ✅ 복사 토스트 문구
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
  if (!copyToast) return;
  const t = setTimeout(() => setCopyToast(null), 2000); // 2초 후 자동 숨김
  return () => clearTimeout(t);
  }, [copyToast]);

  // ✅ summary(50자) vs full style(20자) 표시 모드
  const [mode, setMode] = useState<"summary" | "full">("summary");

  const clampText = (text: string, max: number) => {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
  };

  // ✅ 원문(스타일 설명으로 쓰고 싶은 문장)
  const styleText = track?.desc ?? "";
  // ✅ 보여줄 텍스트: summary일 때 - 50자
  const styleTextToShow = mode === "summary" ? clampText(styleText, 50) : styleText;


  const artist = track?.artist ?? "Unknown Artist";
  // const genre = track?.genre ?? "AI Generated";
  const plays = track?.plays ?? 0;
  const lyricsOrPrompt = track?.lyrics ?? track?.prompt ?? "내용이 없습니다.";


  // ✅ 더미에서 먼저 찾기(빠른 화면 표시용)
  const dummyFound = useMemo(() => {
    if (!id) return null;
    return DUMMY_TRACKS.find((t) => t.id === id) ?? null;
  }, [id]);

  // 곡 제목 정보창에서 바로 편집
   useEffect(() => {
    if (!track) return;
    setTitleDraft(track.title ?? "");
  }, [track]);

  const commitTitle = async () => {
      if (!track) return;

      const nextTitle = titleDraft.trim() || "제목 없음";

      // ✅ 화면에 즉시 반영(로컬 상태 업데이트)
      setTrack((prev) => (prev ? { ...prev, title: nextTitle } : prev));
      setIsEditingTitle(false);

      // ✅ (선택) API가 있을 때 서버에도 저장하고 싶다면 PATCH/PUT 호출
      if (API_BASE) {
        try {
          await fetch(`${API_BASE}/alsong/${track.id}`, {
            method: "PATCH", // 백엔드에 맞게 PUT/PATCH 선택
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: nextTitle }),
          });
        } catch (e) {
          // 실패해도 UI는 이미 바뀐 상태(원하면 여기서 롤백 가능)
          console.error("title save failed", e);
        }
      }
    };

    const cancelTitle = () => {
      if (!track) return;
      setTitleDraft(track.title ?? "");
      setIsEditingTitle(false);
    };


  useEffect(() => {
    if (!id) {
      setError("잘못된 접근입니다. (id 없음)");
      return;
    }

    // ✅ API_BASE가 없으면 더미 데이터로만 표시
    if (!API_BASE) {
      setTrack(dummyFound);
      setError(dummyFound ? null : "해당 곡을 찾지 못했습니다.");
      return;
    }

    // ✅ API_BASE가 있으면 실제 API 호출
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/alsong/${id}`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`API 오류: ${res.status}`);
        }

        const data = await res.json();

        /**
         * ✅ 여기서 data를 너희 API 응답 구조에 맞게 매핑하면 돼.
         * 아래는 "data가 AiTrack과 비슷하게 온다"는 가정.
         */
        const mapped: AiTrack = {
          id: data.id ?? id,
          status: (data.status as AiTrack["status"]) ?? "Draft",
          title: data.title ?? "제목 없음",
          desc: data.desc ?? "",
          duration: data.duration ?? "--:--",
          createdAt: data.createdAt ?? "",
          isAi: data.isAi ?? true,
          coverUrl: data.coverUrl,
          audioUrl: data.audioUrl,
          prompt: data.prompt,
          artist: data.artist ?? "Unknown",
          // genre: data.genre ?? "AI Generated",
          plays: typeof data.plays === "number" ? data.plays : 0,
          lyrics: data.lyrics ?? data.prompt ?? "내용이 없습니다.",
        };

        setTrack(mapped);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // ✅ API 실패 시 더미라도 보여주고 싶으면 fallback
        if (dummyFound) setTrack(dummyFound);
        setError(e?.message ?? "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, id, dummyFound]);



  
    return (
    <div>
      <section className="p-6 text-white">

          {copyToast && (
            <div
              className="fixed left-1/2 top-6 -translate-x-1/2 z-50
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

        {/* ✅ track 있을 때만 본문 렌더 */}
        {track && (
         <div className="flex items-start gap-4">
                {/* 상단 바(뒤로가기) */}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="back"
                  className="
                   w-10 h-10 
                  text-[#f6f6f6] hover:text-[#888]">
                  <MdArrowBackIosNew size={24} />
                </button>
          
           {/* ✅ 오른쪽: “커버+정보+가사”를 한 묶음으로 만들고 세로로 쌓기 */}
           <div className="min-w-0 flex-1 flex flex-col">
              {/* 상단: 커버 + 메타정보 */}
               <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6">
                              {/* 커버 */}
                                <div className="w-52 rounded-2xl overflow-hidden bg-[#353535]"
                                style={{ aspectRatio: "2 / 3" }}>
                                  {track.coverUrl ? (
                                    <img
                                      src={track.coverUrl}
                                      alt="cover"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[#777777] text-sm">
                                      커버 없음
                                    </div>
                                  )}
                                </div>

                {/* 정보 */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    {/* // 정보창 전체 구조 */}
                    <div className="min-w-0 flex-1">
                        <div className={`
                          flex items-end gap-3 w-full
                          border-b-2 pb-3
                          ${isEditingTitle
                            ? "border-[#f6f6f6]"
                            : "border-[#464646] hover:border-[#7a7a7a]"}
                        `}>
                  
                          <input
                            value={titleDraft}
                            readOnly={!isEditingTitle}
                            onChange={(e) => setTitleDraft(e.target.value.slice())}
                            onClick={() => {
                            // 클릭하면 편집 시작 (Suno처럼)
                            if (!isEditingTitle) setIsEditingTitle(true);
                            }}
                            onBlur={() => {
                            // 포커스 밖으로 나가면 저장
                            if (isEditingTitle) commitTitle();
                            }}
                            onKeyDown={(e) => {
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
                              font-inherit leading-tight
                              bg-transparent
                              text-4xl font-semibold
                              outline-none
                              border-0 pb-0
                              ${isEditingTitle ?  "text-[#f6f6f6] border-[#f6f6f6] cursor-text"
                              : "text-[#f6f6f6] border-[#464646] cursor-pointer hover:border-[#7a7a7a]"}
                              ${!isEditingTitle ? "truncate" : ""}
                          `}/>
                        </div>
            

                      <div className="text-sm text-[#f6f6f6]">
                        {loading ? "불러오는 중..." : error ? "오류" : " "}
                      </div>

                      {/* 아티스트 */}
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#d9d9d9] shrink-0" />
                        <div className="text-base text-[#f6f6f6]">{artist}</div>
                      </div>

                      {/* 장르 */}
                      {/* <div className="mt-2 text-xs text-white/60">{genre}</div> */}

                        {/* ✅ 스타일 설명(desc) + 'Show summary / Show full style' 텍스트 버튼 */}
                        {styleText && (
                          <div className="mt-4">
                            {/* ✅ 애니메이션 keyframes: 라이브러리 없이 적용 */}
                            <style>{`
                              @keyframes fadeSlideIn {
                                from { opacity: 0; transform: translateY(4px); }
                                to   { opacity: 1; transform: translateY(0); }
                              }
                            `}</style>

                            <div className="flex items-start gap-2">
                              {/* ✅ mode가 바뀔 때마다 새로 마운트되게 key를 줘서 애니메이션이 매번 실행됨 */}
                              <p
                                key={mode}
                                style={{ animation: "fadeSlideIn 180ms ease-out" }}
                                className="text-sm text-[#f6f6f6] leading-snug flex-1"
                              >
                                {styleTextToShow}
                              </p>

                              {/* ✅ 복사: 항상 원문 전체 복사 */}
                              <button
                                type="button"
                                aria-label="copy description"
                                className="shrink-0 rounded-md text-[#f6f6f6] hover:text-white hover:bg-white/10 transition p-1"
                                onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(styleText);
                                  setCopyToast("곡 스타일과 설명을 복사했습니다");
                                } catch (e) {
                                  setCopyToast("복사에 실패했습니다");
                                }
                                }}
                              >
                                <MdContentCopy size={16} />
                              </button>
                            </div>

                            {/* ✅ 현재 상태에 따라 버튼 1개만 보여주기 */}
                            <div className="text-xs">
                              {mode === "summary" ? (
                                <button
                                  type="button"
                                  onClick={() => setMode("full")}
                                  className="text-[#777777] hover:text-[#f6f6f6] underline underline-offset-2 transition"
                                >
                                  - Show summary
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setMode("summary")}
                                  className="text-[#777777] hover:text-[#f6f6f6] underline underline-offset-2 transition"
                                >
                                  + Show full style
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div> 

                    {/* 날짜 | 조회수 + 업로드 버튼 */}
                    <div className="mt-8 flex items-center justify-between gap-4">
                      <div className="text-base text-[#f6f6f6]">
                        {track.createdAt} | {plays}회 | {track.duration}
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={track.status === "Upload"}
                        onClick={()=> {
                          if (track.status === "Upload") return;
                          console.log("업로드하기", track.id);
                          // TODO: 업로드 관련 백엔드 API 붙이기
                        }}
                        className={`
                          inline-flex items-center justify-center gap-1
                          w-30 h-10 px-3 rounded-full text-sm
                          transition
                          ${track.status === "Upload"
                          ? "bg-[#555555] text-[#999999] cursor-not-allowed"
                          : "bg-[#777777] text-[#f6f6f6] hover:bg-white/25"}
                          `}
                          aria-label="upload"
                          >
                          {<MdFileUpload size={18} />}
                          {track.status === "Upload" ? "업로드됨" : "업로드하기"}
                      </button>

                      <ActionSquare icon={<MdPlayArrow size={20} />} label="재생" />
                      {/* // URL 복사를 통한 공유 */}
                      <ActionSquare
                      icon={<MdShare size={18} />}
                      label="공유"
                      onClick={async () => {
                      try {
                        const url = window.location.href; // 현재 페이지 URL
                        await navigator.clipboard.writeText(url); // 클립보드 복사
                        setCopyToast("URL을 복사했습니다");
                      } catch (e) {
                        setCopyToast("복사에 실패했습니다");
                      }
                      }}
                      />
                      <ActionSquare icon={<MdAdd size={20} />} label="담기" />
                      <ActionSquare
                        icon={<MdFavoriteBorder size={18} />}
                        label="좋아요"/>
                    </div>
                  </div>
                </div>

                  {/* 왼쪽 하단 - 가사 */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6">
                    <pre className="whitespace-pre-wrap text-sm text-[#f6f6f6] leading-relaxed">
                      {lyricsOrPrompt}
                    </pre>
                  <div className="hidden md:block md:col-start-2" />
               </div>
           </div>
         </div>  
        )}
      </section>
    </div>
  
  );
}