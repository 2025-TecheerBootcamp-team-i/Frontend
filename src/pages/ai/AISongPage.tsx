import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MdPlayArrow,
  MdShare,
  MdAdd,
  MdFavoriteBorder,
  MdFileUpload,
  MdContentCopy,
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

  // ✅ 소유자 판별용(너희 데이터에 맞게 필드명 조정)
  ownerId?: string;
  ownerName?: string;
};

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
    plays: 100,
    lyrics: `[Verse 1]\n퇴근 시간 한참 전에\n우리 하루 이제 시작\n모니터 불빛 아래\n눈은 빨갛지만 입꼬린 살아 있어\n\n커피 줄 서 있는 사이에러 메시지 또 뜨네\n“이건 어제도 봤는데”\n웃으면서 다시 로그를 따라가\n\n[Chorus]`,
    prompt: "새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬...",
    ownerId: "me", // ✅ 더미: 내 곡이라고 가정
    ownerName: "나",
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
    plays: 0,
    lyrics: "가사가 아직 없습니다.",
    prompt: "예시 프롬프트",
    ownerId: "other", // ✅ 더미: 남의 곡
    ownerName: "누군가",
  })),
];

const FADE_STYLE = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

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
        shrink-0
        h-9 w-9 rounded-lg
        inline-flex items-center justify-center
        transition
        ${
          disabled
            ? "bg-[#555555] text-[#999999] cursor-not-allowed"
            : "bg-[#777777] hover:bg-white/25 text-[#d9d9d9]"
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

  const [track, setTrack] = useState<AiTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [copyToast, setCopyToast] = useState<string | null>(null);

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
  const styleTextToShow = mode === "summary" ? clampText(styleText, 50) : styleText;

  const artist = track?.artist ?? "Unknown Artist";
  const plays = track?.plays ?? 0;
  const lyricsOrPrompt = track?.lyrics ?? track?.prompt ?? "내용이 없습니다.";

  const dummyFound = useMemo(() => {
    if (!id) return null;
    return DUMMY_TRACKS.find((t) => t.id === id) ?? null;
  }, [id]);

  useEffect(() => {
    if (!track) return;
    setTitleDraft(track.title ?? "");
  }, [track]);

  // ✅ 현재 로그인 유저(너희 앱 실제 값으로 교체)
  const CURRENT_USER_ID = "me";

  // ✅ 소유자 여부
  const isOwner = track?.ownerId ? track.ownerId === CURRENT_USER_ID : false;

  const commitTitle = async () => {
    if (!track) return;
    if (!isOwner) return; // ✅ 남의 곡이면 저장 자체 금지

    const nextTitle = titleDraft.trim() || "제목 없음";
    setTrack((prev) => (prev ? { ...prev, title: nextTitle } : prev));
    setIsEditingTitle(false);

    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/alsong/${track.id}`, {
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

        const res = await fetch(`${API_BASE}/alsong/${id}`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(`API 오류: ${res.status}`);
        const data = await res.json();

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
          plays: typeof data.plays === "number" ? data.plays : 0,
          lyrics: data.lyrics ?? data.prompt ?? "내용이 없습니다.",

          // ✅ 소유자 정보 매핑(너희 응답에 맞게 수정)
          ownerId: data.ownerId,
          ownerName: data.ownerName,
        };

        setTrack(mapped);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (dummyFound) setTrack(dummyFound);
        setError(e?.message ?? "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, id, dummyFound]);

  // ✅ 남의 곡 보고 있을 때 편집모드가 켜져있으면 자동 종료
  useEffect(() => {
    if (!isOwner && isEditingTitle) {
      setIsEditingTitle(false);
    }
  }, [isOwner, isEditingTitle]);

  return (
    <div className="w-full h-full overflow-x-auto">
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
                    <img src={track.coverUrl} alt="cover" className="h-full w-full object-cover" />
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
                          readOnly={!isEditingTitle || !isOwner} // ✅ 남의 곡이면 항상 readOnly
                          onChange={(e) => setTitleDraft(e.target.value)}
                          onClick={() => {
                            if (!isOwner) return; // ✅ 남의 곡이면 편집 시작 금지
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
                          title={!isOwner ? "다른 사용자가 만든 곡은 제목을 수정할 수 없습니다." : undefined}
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
                              console.log("업로드하기", track.id);
                            }}
                            className={`
                              shrink-0
                              inline-flex items-center justify-center gap-1
                              w-[120px] h-9 px-3 rounded-full text-sm
                              transition
                              ${
                                track.status === "Upload"
                                  ? "bg-[#555555] text-[#999999] cursor-not-allowed"
                                  : "bg-[#777777] text-[#f6f6f6] hover:bg-white/25"
                              }
                            `}
                            aria-label="upload"
                          >
                            <MdFileUpload size={18} />
                            {track.status === "Upload" ? "업로드됨" : "업로드하기"}
                          </button>
                        )}

                        {/* ✅ 나머지는 공용(원하면 이것도 소유자/로그인 유저만 허용 가능) */}
                        <ActionSquare icon={<MdPlayArrow size={20} />} label="재생" />
                        <ActionSquare
                          icon={<MdShare size={18} />}
                          label="공유"
                          onClick={async () => {
                            try {
                              const url = window.location.href;
                              await navigator.clipboard.writeText(url);
                              setCopyToast("URL을 복사했습니다");
                            } catch {
                              setCopyToast("복사에 실패했습니다");
                            }
                          }}
                        />
                        <ActionSquare icon={<MdAdd size={20} />} label="담기" />
                        <ActionSquare icon={<MdFavoriteBorder size={18} />} label="좋아요" />
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
      </section>
    </div>
  );
}
