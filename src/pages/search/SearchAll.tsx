// src/pages/search/SearchHome.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdOutlineNavigateNext, MdPlayArrow } from "react-icons/md";

// ✅ MyPlaylistPage 디자인 참고용 스크롤러(디자인만)
type HorizontalScrollerProps = {
  children: React.ReactNode;
  scrollStep?: number;
  gradientFromClass?: string;
};

function HorizontalScroller({
  children,
  scrollStep = 300,
  gradientFromClass = "from-[#2d2d2d]/80",
}: HorizontalScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;

    const can = el.scrollWidth > el.clientWidth + 1;
    setCanScroll(can);

    if (!can) {
      setShowLeft(false);
      setShowRight(false);
      return;
    }

    const left = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;

    setShowLeft(left > 4);
    setShowRight(left < max - 4);
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="relative mt-2">
      <div ref={ref} onScroll={update} className="overflow-x-auto overflow-y-hidden no-scrollbar">
        {children}
      </div>

      {canScroll && showLeft && (
        <button
          type="button"
          onClick={() => {
            ref.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
            setTimeout(update, 250);
          }}
          className="
            absolute left-1 top-1/2 -translate-y-1/2 z-10
            h-9 w-9 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
          aria-label="왼쪽으로 이동"
        >
          <MdOutlineNavigateNext className="rotate-180" size={22} />
        </button>
      )}

      {canScroll && showRight && (
        <button
          type="button"
          onClick={() => {
            ref.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
            setTimeout(update, 250);
          }}
          className="
            absolute right-1 top-1/2 -translate-y-1/2 z-10
            h-9 w-9 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
          aria-label="오른쪽으로 이동"
        >
          <MdOutlineNavigateNext size={22} />
        </button>
      )}

      {canScroll && showRight && (
        <div
          className={[
            "pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l to-transparent",
            gradientFromClass,
          ].join(" ")}
        />
      )}
      {canScroll && showLeft && (
        <div
          className={[
            "pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r to-transparent",
            gradientFromClass,
          ].join(" ")}
        />
      )}
    </div>
  );
}

type Song = { id: string; title: string; artist: string; duration: string };
type Artist = { id: string; name: string };
type Album = { id: string; name: string; artist: string };

// ✅ 더미 데이터 (나중에 API로 교체)
const ALL_SONGS: Song[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  title: "곡 명",
  artist: "아티스트명",
  duration: "2:27",
}));

const ALL_ARTISTS: Artist[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  name: `인기 아티스트 ${i + 1}`,
}));

const ALL_ALBUMS: Album[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  name: `앨범 ${i + 1}`,
  artist: `아티스트명 ${((i % 3) + 1).toString()}`,
}));

function SectionShell({
  title,
  onMore,
  children,
}: {
  title: string;
  onMore?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646]">
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onMore}
          className="text-lg font-semibold hover:text-[#888] text-[#F6F6F6]"
        >
          {title}
        </button>

        <button
          type="button"
          onClick={onMore}
          className="text-[#F6F6F6] hover:text-[#888] transition text-xl leading-none"
          aria-label={`${title} 더보기`}
          title="더보기"
        >
          <MdOutlineNavigateNext size={30} />
        </button>
      </div>

      <div className="mb-4 mx-4 border-b border-[#464646]" />
      <div className="px-6 pb-6">{children}</div>
    </section>
  );
}

export default function SearchHome() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const q = (sp.get("q") ?? "").trim();
  const search = q ? `?q=${encodeURIComponent(q)}` : "";

  // ✅ 검색어 필터
  const songs = useMemo(() => {
    if (!q) return ALL_SONGS;
    const lower = q.toLowerCase();
    return ALL_SONGS.filter(
      (s) => s.title.toLowerCase().includes(lower) || s.artist.toLowerCase().includes(lower)
    );
  }, [q]);

  const artists = useMemo(() => {
    if (!q) return ALL_ARTISTS;
    const lower = q.toLowerCase();
    return ALL_ARTISTS.filter((a) => a.name.toLowerCase().includes(lower));
  }, [q]);

  const albums = useMemo(() => {
    if (!q) return ALL_ALBUMS;
    const lower = q.toLowerCase();
    return ALL_ALBUMS.filter(
      (a) => a.name.toLowerCase().includes(lower) || a.artist.toLowerCase().includes(lower)
    );
  }, [q]);

  const featured = songs[0] ?? null;

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <div className="space-y-4">
          {/* ✅ 상단 2열 (MyPlaylistPage 느낌으로 카드 통일) */}
          <div className="overflow-x-auto">
          <div className="grid gap-4 grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)] min-w-[920px]">
            {/* 대표 카드 */}
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
              <div className="px-8 pt-6 pb-2 flex items-center justify-between">
                <div className="text-lg font-semibold text-[#F6F6F6]">상위 결과</div>
              </div>

              <div className="mx-4 border-b border-[#464646]" />

              <div className="p-4">
              {/* ✅ 상위 결과 카드 본문 */}
              <div
                className="
                  group relative
                  w-full
                  rounded-3xl
                  hover:bg-[#1d1d1d]/45 transition
                  p-4
                "
              >
                {(() => {
                  const featuredKind = featured ? "song" : "artist";
                  return (
                    <div className="flex flex-col">
                      {/* 커버 */}
                      <div
                        className={[
                          "w-[200px] h-[200px] bg-[#777777]",
                          featuredKind === "artist" ? "rounded-full" : "rounded-2xl",
                        ].join(" ")}
                      />

                      {/* 텍스트 */}
                      <div className="mt-5 min-w-0">
                        <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                          {featured ? featured.title : "곡 또는 아티스트명"}
                        </div>
                        <div className="mt-1 text-sm text-[#F6F6F6]/60 truncate">
                          {featuredKind === "artist" ? "아티스트" : "곡"}
                        </div>
                      </div>

                      {/* ▶ 재생 버튼 (hover 때만) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 여기서 실제 재생 연결
                        }}
                        className="
                          absolute right-0 bottom-4
                          -translate-x-4 -translate-y-4
                          w-12 h-12 rounded-full
                          bg-[#AFDEE2] text-[#1d1d1d]
                          grid place-items-center
                          shadow-lg
                          hover:bg-[#87B2B6] transition

                          opacity-0 translate-y-1 pointer-events-none
                          group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                        "
                        aria-label="재생"
                        title="재생"
                      >
                        <MdPlayArrow size={26} />
                      </button>
                    </div>
                  );
                })()}
              </div>
              </div>
            </section>

            {/* 곡 리스트 카드 (MyPlaylistPage 테두리/구분선 스타일로) */}
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
              <div className="px-8 pt-6 pb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/search/song${search}`)}
                  className="text-lg font-semibold hover:text-[#888] text-[#F6F6F6]"
                >
                  곡
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/search/song${search}`)}
                  className="text-[#F6F6F6] hover:text-[#888] transition text-xl leading-none"
                  aria-label="곡 더보기"
                  title="더보기"
                >
                  <MdOutlineNavigateNext size={30} />
                </button>
              </div>

              <div className="mx-4 border-b border-[#464646]" />

              <div className="pb-2 px-4">
                {(songs.length ? songs : ALL_SONGS).slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate(`/search/song${search}`)}
                    className="w-full text-left px-2 py-3 hover:bg-white/5 transition border-b border-[#464646] last:border-b-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[#F6F6F6]">{s.title}</div>
                        <div className="truncate text-xs text-[#F6F6F6]/60">{s.artist}</div>
                      </div>
                      <div className="w-12 text-right text-sm text-[#F6F6F6]/70 tabular-nums">
                        {s.duration}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {q && songs.length === 0 && (
                <div className="px-8 pb-6 text-sm text-[#F6F6F6]/60">해당 검색어의 곡이 없습니다.</div>
              )}
            </section>
          </div>
          </div>

          {/* ✅ 아티스트 미리보기 (MyPlaylistPage 가로 스크롤 카드 스타일) */}
          <SectionShell title="아티스트" onMore={() => navigate(`/search/artist${search}`)}>
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
              <div className="flex gap-2 min-w-max px-2">
                {(artists.length ? artists : ALL_ARTISTS).slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate(`/search/artist${search}`)}
                    className="w-[220px] text-left group shrink-0"
                  >
                    <div className="w-48 h-48 ml-2 rounded-full bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />
                    <div className="mt-3 text-sm ml-2 font-semibold text-[#F6F6F6] truncate">{a.name}</div>
                    <div className="mt-1 text-xs ml-2 text-[#F6F6F6]/60 truncate">아티스트</div>
                  </button>
                ))}
              </div>
            </HorizontalScroller>

            {q && artists.length === 0 && (
              <div className="mt-3 text-sm text-[#F6F6F6]/60">해당 검색어의 아티스트가 없습니다.</div>
            )}
          </SectionShell>

          {/* ✅ 앨범 미리보기 (가로 스크롤 카드 스타일로 통일) */}
          <SectionShell title="앨범" onMore={() => navigate(`/search/album${search}`)}>
            <HorizontalScroller gradientFromClass="from-[#2d2d2d]/80">
              <div className="flex gap-2 min-w-max px-2">
                {(albums.length ? albums : ALL_ALBUMS).slice(0, 10).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate(`/search/album${search}`)}
                    className="w-[220px] text-left group shrink-0"
                  >
                    <div className="w-48 h-48 rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />
                    <div className="mt-3 ml-1 text-sm font-semibold text-[#F6F6F6] truncate">{a.name}</div>
                    <div className="mt-1 ml-1 text-xs text-[#F6F6F6]/60 truncate">{a.artist}</div>
                  </button>
                ))}
              </div>
            </HorizontalScroller>

            {q && albums.length === 0 && (
              <div className="mt-3 text-sm text-[#F6F6F6]/60">해당 검색어의 앨범이 없습니다.</div>
            )}
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
