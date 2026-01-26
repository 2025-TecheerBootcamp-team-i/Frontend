import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { fetchPopularArtists, type PopularArtist } from "../../api/artist";
import { fetchChart, type ChartData, type ChartType, type ChartRow as ApiChartRow } from "../../api/chart";


import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

import DjStationSection from "./DjStationSection";
import GenreStationSection from "./GenreStationSection";




function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function HomePage() {
  const navigate = useNavigate();
  const { setTrackAndPlay } = usePlayer();

  const [tab, setTab] = useState<"TOP100" | "DAILY" | "AI">("TOP100");

  const goChart = () => {
    const map = { TOP100: "top100", DAILY: "daily", AI: "ai" } as const;
    navigate(`/chart/${map[tab]}`);
  };

  const [popularArtists, setPopularArtists] = useState<PopularArtist[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularError, setPopularError] = useState<string | null>(null);

  const [chartByType, setChartByType] = useState<Record<ChartType, ChartData | null>>({
    realtime: null,
    daily: null,
    ai: null,
  });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);





  const TAB_TO_CHARTTYPE: Record<"TOP100" | "DAILY" | "AI", ChartType> = {
    TOP100: "realtime",
    DAILY: "daily",
    AI: "ai",
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArtistScrollHint = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const prevRankByIdRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setPopularLoading(true);
        setPopularError(null);

        const data = await fetchPopularArtists(20);
        if (!alive) return;

        setPopularArtists(data);
      } catch (e: unknown) {
        if (!alive) return;
        setPopularError(getErrorMessage(e, "인기 아티스트 로딩 실패"));
      } finally {
        setPopularLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(updateArtistScrollHint);
  }, [popularArtists]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateArtistScrollHint();
    el.addEventListener("scroll", updateArtistScrollHint);
    window.addEventListener("resize", updateArtistScrollHint);

    return () => {
      el.removeEventListener("scroll", updateArtistScrollHint);
      window.removeEventListener("resize", updateArtistScrollHint);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const results = await Promise.allSettled([fetchChart("daily"), fetchChart("ai")]);
        if (!alive) return;

        const daily = results[0].status === "fulfilled" ? results[0].value : null;
        const ai = results[1].status === "fulfilled" ? results[1].value : null;

        setChartByType((prev) => ({ ...prev, daily, ai }));
      } catch (e: unknown) {
        console.error("일일/AI 차트 로딩 실패:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);



  useEffect(() => {
    let alive = true;

    const loadRealtime = async () => {
      try {
        setChartLoading(true);
        setChartError(null);

        const realtime = await fetchChart("realtime");
        if (!alive) return;

        const nextPrev: Record<string, number> = {};
        for (const item of realtime.items) nextPrev[item.musicId] = item.rank;
        prevRankByIdRef.current = nextPrev;

        setChartByType((prev) => ({ ...prev, realtime }));
      } catch (e: unknown) {
        if (!alive) return;
        setChartError(getErrorMessage(e, "실시간 차트 로딩 실패"));
      } finally {
        if (alive) setChartLoading(false);
      }
    };

    loadRealtime();
    const timer = window.setInterval(loadRealtime, 10 * 60 * 1000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);



  const tabBtn = (key: "TOP100" | "DAILY" | "AI", label: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={[
          "h-10 text-sm px-4 py-2 rounded-full transition whitespace-nowrap",
          active
            ? "bg-[#E4524D]/80 text-[#f6f6f6] font-semibold scale-105 z-10"
            : "bg-white/20 text-[#F6F6F6] hover:bg-white/[0.08] font-semibold hover:scale-105",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const currentType = TAB_TO_CHARTTYPE[tab];
  const currentChart = chartByType[currentType];

  const previewRows = (() => {
    if (!currentChart) return [];
    const seen = new Set<string>();
    const unique = currentChart.items.filter((item) => {
      if (seen.has(item.musicId)) return false;
      seen.add(item.musicId);
      return true;
    });
    return unique.slice(0, 6);
  })();

  const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const toTrack = (row: ApiChartRow): PlayerTrack => {
    const audioUrl = row.audioUrl && row.audioUrl.length > 0 ? row.audioUrl : "/audio/sample.mp3";
    return {
      id: row.musicId,
      musicId: Number(row.musicId),
      title: row.musicName,
      artist: row.artistName,
      coverUrl: row.albumImage,
      audioUrl,
      duration: formatDuration(row.durationSec),
    };
  };

  return (
    // ✅ “반응형 끄기”: 전체를 고정폭으로 두고, 화면이 작으면 그냥 가로 스크롤
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1280px]">
        {/* 인기 아티스트 */}
        <section className="mb-2">
          <div className="relative overflow-x-auto pb-2">
            <div
              ref={scrollRef}
              // ✅ 줄어들면 줄바꿈/압축 대신 그냥 가로가 길어지게
              className="flex gap-8 min-w-max w-max px-4 py-6 min-h-[280px]"
            >
              {/* 로딩/에러 상태를 실제 콘텐츠 영역 안에서 처리 */}
              {popularLoading && (
                <div className="flex items-center justify-center w-full text-[#F6F6F6]/50">로딩중...</div>
              )}
              {popularError && <div className="text-red-300 px-2">{popularError}</div>}

              {!popularLoading &&
                !popularError &&
                popularArtists.map((a) => (
                  <div
                    key={a.artist_id}
                    className="shrink-0 flex flex-col items-center group cursor-pointer"
                    onClick={() => navigate(`/artists/${a.artist_id}`)}
                  >
                    <div
                      className="
                        w-[180px] h-[180px] rounded-full bg-white/[0.05]
                        transition-all duration-700 ease-out
                        group-hover:-translate-y-2 group-hover:scale-110
                        group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.35),0_0_30px_rgba(175,222,226,0.15)]
                        overflow-hidden relative
                        backdrop-blur-2xl
                        shadow-[inset_0_2px_15px_rgba(255,255,255,0.2),0_15px_30px_rgba(0,0,0,0.4)]
                      "
                    >
                      {a.image_small_circle ? (
                        <>
                          <img
                            src={a.image_small_circle}
                            alt={a.artist_name}
                            width={180}
                            height={180}
                            className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 opacity-80 group-hover:opacity-100 brightness-95 group-hover:brightness-110"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                          />
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/20 pointer-events-none" />
                          <div className="absolute top-[8%] left-[15%] w-[45%] h-[25%] bg-gradient-to-b from-white/50 to-transparent rounded-[100%] rotate-[-15deg] blur-[3px] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                          {/* ✅ 원래 코드 오타( right([10%] ) ) 고침 */}
                          <div className="absolute bottom-[5%] right-[10%] w-[35%] h-[20%] bg-white/30 blur-[10px] rounded-full pointer-events-none" />
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 animate-pulse bg-white/5">
                          <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 w-[220px] text-center text-xl font-bold text-[#F6F6F6]/90 break-words leading-tight transition group-hover:text-[#f6f6f6]/60">
                      {a.artist_name}
                    </div>
                    <div className="mt-2 text-sm font-medium text-[#e0e0e0]/90 tracking-wide">
                      #{a.rank} · {a.play_count}회
                    </div>
                  </div>
                ))}
            </div>

            {showLeft && (
              <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-black/40 to-transparent z-10" />
            )}
            {showRight && (
              <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-black/40 to-transparent z-10" />
            )}
          </div>
        </section>





        {/* 차트 요약 */}
        <section className="mb-4">
          <div className="w-full rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 p-8 pb-4">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="flex items-center justify-between gap-4 pt-2 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end gap-4 mb-1 min-w-0">
                      <button
                        type="button"
                        onClick={goChart}
                        className="px-2 text-[43px] font-bold text-[#f6f6f6] leading-none hover:text-[#f6f6f6]/50 transition whitespace-nowrap"
                      >
                        실시간 차트
                      </button>

                      <div className="flex gap-3 shrink-0">
                        {tabBtn("TOP100", "TOP 100")}
                        {tabBtn("DAILY", "일일차트")}
                        {tabBtn("AI", "AI 음악")}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goChart}
                    className="px-3 shrink-0 text-[#f6f6f6] hover:text-[#f6f6f6]/50 text-3xl leading-none transition"
                    aria-label="차트로 이동"
                  >
                    <MdOutlineNavigateNext size={40} />
                  </button>
                </div>

                <div className="border-b border-white/10" />

                {/* min-height로 레이아웃 고정 */}
                <div className="divide-y divide-white/5 overflow-hidden min-h-[540px]">
                  {chartLoading && (
                    <div className="flex items-center justify-center h-[540px] text-[#f6f6f6]/50">차트 로딩중...</div>
                  )}
                  {chartError && <div className="p-4 text-red-400/80">{chartError}</div>}

                  {!chartLoading && !chartError && previewRows.map((row) => (
                    <div
                      key={row.musicId}
                      className="
                        group w-full text-left grid
                        grid-cols-[72px_84px_1fr_1fr_96px]
                        items-center
                        px-3 py-3
                        hover:bg-white/[0.08] transition-all
                      "
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="text-2xl font-bold text-[#F6F6F6] transition-opacity group-hover:opacity-0">
                          {row.rank}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackAndPlay(toTrack(row));
                          }}
                          className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#AFDEE2] text-3xl"
                          aria-label="재생"
                        >
                          <FaPlay />
                        </button>
                      </div>

                      <div className="text-center text-base font-bold">
                        {(() => {
                          const change = row.rankChange;
                          if (change === null || change === 0) return <span className="text-[#AAAAAA]">—</span>;
                          if (change > 0) return <span className="text-red-500">▲ {change}</span>;
                          if (change < 0) return <span className="text-blue-500">▼ {Math.abs(change)}</span>;
                          return <span className="text-[#AAAAAA]">—</span>;
                        })()}
                      </div>

                      <div className="ml-3 flex items-center gap-5 min-w-0 truncate">
                        {row.albumImage ? (
                          <img
                            src={row.albumImage}
                            alt={row.albumName}
                            width={72}
                            height={72}
                            className="w-[72px] h-[72px] rounded-2xl object-cover bg-[#D9D9D9] shrink-0 shadow-lg"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "block";
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-[72px] h-[72px] rounded-2xl bg-[#D9D9D9] shrink-0 ${row.albumImage ? "hidden" : ""
                            }`}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="text-xl font-semibold text-[#F6F6F6] whitespace-nowrap truncate tracking-tight">
                              {row.musicName}
                            </div>
                            {row.isAi && (
                              <span className="shrink-0 text-xs px-2 py-[2px] rounded-full bg-[#E4524D]/20 text-[#E4524D]">
                                AI
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-[#F6F6F6]/40 truncate">{row.albumName}</div>
                        </div>
                      </div>

                      {/* ✅ 반응형 끔: hidden sm:block 제거 */}
                      <div className="text-lg text-[#F6F6F6]/80 whitespace-nowrap font-medium">{row.artistName}</div>

                      <div className="text-right pr-5 text-lg text-[#F6F6F6]/55 whitespace-nowrap font-mono">
                        {formatDuration(row.durationSec)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center border-t border-white/10 p-5 text-[#f6f6f6]/50">
                  <button
                    type="button"
                    onClick={goChart}
                    aria-label="전체 차트로 이동"
                    title="전체 차트"
                    className="text-base hover:text-[#f6f6f6]/80 transition"
                  >
                    더보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DJ Station */}
        <DjStationSection />

        {/* Genre Station */}
        <GenreStationSection />


      </div>
    </div >
  );
}

export default HomePage;
