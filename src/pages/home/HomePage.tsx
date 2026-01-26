import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineNavigateNext } from "react-icons/md";

import { fetchPopularArtists, type PopularArtist } from "../../api/artist";
import { fetchChart, type ChartData, type ChartType } from "../../api/chart";
import { listAllAiMusic } from "../../api/music";

import DjStationSection from "./DjStationSection";
import GenreStationSection from "./GenreStationSection";


import MusicVerseBanner from "./MusicVerseBanner";
import CompactChart from "./CompactChart";

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function HomePage() {
  const navigate = useNavigate();

  const goChart = () => {
    navigate(`/chart/top100`);
  };

  const [tab, setTab] = useState<"TOP100" | "DAILY" | "AI">("TOP100");

  const [popularArtists, setPopularArtists] = useState<PopularArtist[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularError, setPopularError] = useState<string | null>(null);

  const [chartByType, setChartByType] = useState<Record<ChartType, ChartData | null>>({
    realtime: null,
    daily: null,
    ai: null,
  });
  const [chartLoading, setChartLoading] = useState(false);

  // AI 음악 배경 이미지
  const [aiBg, setAiBg] = useState<string | null>(null);

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

  // AI 음악 배경 이미지 로드
  useEffect(() => {
    let alive = true;

    const fetchAiBg = async () => {
      try {
        const list = await listAllAiMusic({ is_ai: true });
        if (!alive) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidates = list.filter((m: any) => m.album_image || m.album_image_square);
        if (candidates.length > 0) {
          const randomIdx = Math.floor(Math.random() * candidates.length);
          const picked = candidates[randomIdx];
          setAiBg(picked.album_image || picked.album_image_square);
        }
      } catch (e) {
        console.error("Failed to load AI background:", e);
      }
    };

    fetchAiBg();
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

        const realtime = await fetchChart("realtime");
        if (!alive) return;

        const nextPrev: Record<string, number> = {};
        for (const item of realtime.items) nextPrev[item.musicId] = item.rank;
        prevRankByIdRef.current = nextPrev;

        setChartByType((prev) => ({ ...prev, realtime }));
      } catch (e: unknown) {
        if (!alive) return;
        console.error("실시간 차트 로딩 실패", e);
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

  const TAB_TO_CHARTTYPE: Record<"TOP100" | "DAILY" | "AI", ChartType> = {
    TOP100: "realtime",
    DAILY: "daily",
    AI: "ai",
  };

  const currentType = TAB_TO_CHARTTYPE[tab];
  const currentChart = chartByType[currentType];

  return (
    // ✅ “반응형 끄기”: 전체를 고정폭으로 두고, 화면이 작으면 그냥 가로 스크롤
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1280px]">
        <section className="mb-6">
          <div className="relative overflow-x-auto">
            <div
              ref={scrollRef}
              // ✅ 줄어들면 줄바꿈/압축 대신 그냥 가로가 길어지게
              className="flex gap-8 min-w-max w-max min-h-[280px] px-4 py-6"
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


        {/* ✨ Redesigned Grid Section (As per user request) ✨ */}
        <section className="mb-6 grid grid-cols-12 gap-6 h-[560px]"> {/* Fixed total height to match columns */}

          {/* Left Column (Banner + For You) - Span 5 (Narrower) */}
          <div className="col-span-5 flex flex-col gap-6 h-full">
            {/* 1. Music Verse Banner (Top ~50%) */}
            <div className="flex-1">
              <MusicVerseBanner />
            </div>

            {/* 2. AI 음악 만들기 (Bottom ~50%) */}
            <div
              onClick={() => navigate("/ai")}
              className="group ml-1.5 relative flex-1 rounded-[32px] overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            >
              {/* Background Image */}
              <div className="absolute inset-0 bg-black">
                {aiBg ? (
                  <img
                    src={aiBg}
                    alt="AI Music"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-600 via-red-500 to-pink-500 opacity-80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              </div>

              {/* Arrow Button - Top Right */}
              <div className="absolute top-6 right-6 z-20">
                <div
                  className="
                    w-12 h-12
                    rounded-full
                    bg-white/20 backdrop-blur-md
                    flex items-center justify-center
                    text-white
                    group-hover:bg-white/30
                    transition
                  "
                >
                  <MdOutlineNavigateNext size={28} />
                </div>
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center p-10 z-10">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-xs font-bold tracking-widest mb-4">
                    AI GENERATION
                  </span>
                  <h2 className="text-5xl font-black text-white tracking-tighter leading-tight mb-4">
                    AI 음악<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">만들기</span>
                  </h2>
                </div>
              </div>

              {/* Decorative Floating Elements */}
              <div className="absolute top-10 right-10 w-32 h-32 bg-orange-500/30 rounded-full blur-[50px] animate-pulse" />
              <div className="absolute bottom-[-20px] left-[20%] w-40 h-40 bg-red-500/20 rounded-full blur-[60px]" />
            </div>
          </div>

          {/* Right Column (Chart) - Span 7 (Wider) */}
          <div className="col-span-7 h-full">
            <CompactChart
              items={currentChart?.items || []}
              loading={chartLoading}
              onMoreClick={goChart}
              activeTab={tab}
              onTabChange={setTab}
            />
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
