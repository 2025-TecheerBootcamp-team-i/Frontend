import Header from "../../components/layout/Header";
import Sidebar from "../../components/layout/Sidebar";
import { useMemo, useRef, useState, useEffect } from "react";
import { MdOutlineNavigateNext, MdPlayArrow, MdMoreVert } from "react-icons/md";

type Tab = "모두" | "아티스트" | "곡" | "앨범";

type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
};

type Artist = { id: string; name: string };

type Album = {
  id: string;
  name: string;
  artist: string;
};

const TABS: Tab[] = ["모두", "아티스트", "곡", "앨범"];

const ALL_SONGS: Song[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  title: `곡 명 ${i + 1}`,
  artist: `아티스트명 ${((i % 3) + 1).toString()}`,
  duration: "2:27",
}));

const ALL_ARTISTS: Artist[] = Array.from({ length: 6 }).map((_, i) => ({
  id: String(i + 1),
  name: `인기 아티스트 ${i + 1}`,
}));

const ALL_ALBUMS: Album[] = Array.from({ length: 4 }).map((_, i) => ({
  id: String(i + 1),
  name: `앨범 ${i + 1}`,
  artist: `아티스트명 ${((i % 3) + 1).toString()}`,
}));

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>("모두");

  // 지금 Header input과 연결하지 않았으므로, 화면에서 테스트용 검색 input을 하나 둠
  const [query, setQuery] = useState("");

  // 아티스트 가로 스크롤 그라데이션
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const q = query.trim();

  const songs = useMemo(() => {
    if (!q) return ALL_SONGS;
    const lower = q.toLowerCase();
    return ALL_SONGS.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower)
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
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.artist.toLowerCase().includes(lower)
    );
  }, [q]);

  const featured = songs[0] ?? null;

  return (
    <div className="h-screen bg-[#ffffff] flex flex-col">
      {/* 헤더 */}
      <Header />

      <div className="flex flex-1 min-h-0">
        {/* 사이드바 */}
        <Sidebar />

        {/* 메인 */}
        <main className="flex-1 min-h-0 overflow-auto p-6">
          <div className="space-y-6">
            {/* (임시) 검색어 입력 - Header와 연결 전 테스트용 */}
            <div className="flex items-center gap-3">
              {q && (
                <div className="text-sm text-[#666666]">
                  검색어: <span className="font-semibold">“{q}”</span>
                </div>
              )}
            </div>

            {/* 탭 */}
            <div className="flex items-center gap-3">
              {TABS.map((t) => {
                const active = t === tab;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={[
                      "rounded-full px-5 py-2 text-sm transition",
                      active
                        ? "bg-[#6B6B6B] text-white"
                        : "bg-[#E9E9E9] text-[#666666] hover:bg-[#DDDDDD]",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* 상단 2열 */}
            {(tab === "모두" || tab === "곡" || tab === "아티스트") && (
              <div className="grid grid-cols-12 gap-6">
                {/* 대표 카드 */}
                <section className="col-span-12 lg:col-span-7 rounded-3xl bg-[#F3F3F3] p-6">
                  <div className="flex gap-6">
                    <div className="h-44 w-44 rounded-2xl bg-[#D9D9D9]" />

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="text-lg font-semibold text-[#666666]">
                          {featured ? featured.title : "곡 또는 아티스트명"}
                        </div>
                        <div className="mt-2 text-sm text-[#8A8A8A]">
                          {featured ? "분류 (곡)" : "분류 (곡 or 아티스트)"}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6B6B6B] text-white hover:bg-[#5A5A5A]"
                          aria-label="play"
                        >
                          <MdPlayArrow size={28} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 곡 리스트 카드 */}
                <section className="col-span-12 lg:col-span-5 rounded-3xl bg-[#F3F3F3] p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold text-[#666666]">
                      곡
                    </div>
                    <button
                      className="text-[#666666] hover:text-[#888] transition"
                      aria-label="open"
                    >
                      <MdOutlineNavigateNext size={28} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(songs.length ? songs : ALL_SONGS).slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-2 hover:bg-white"
                      >
                        <div className="h-10 w-10 rounded-xl bg-[#D9D9D9]" />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-[#666666]">
                            {s.title}
                          </div>
                        </div>

                        <div className="min-w-0 w-24">
                          <div className="truncate text-sm text-[#8A8A8A]">
                            {s.artist}
                          </div>
                        </div>

                        <div className="w-12 text-right text-sm text-[#8A8A8A]">
                          {s.duration}
                        </div>

                        <button
                          className="text-[#8A8A8A] hover:text-[#666666]"
                          aria-label="more"
                        >
                          <MdMoreVert size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* 아티스트 섹션 */}
            {(tab === "모두" || tab === "아티스트") && (
              <section className="rounded-3xl bg-[#F3F3F3] p-6">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-[#666666]">
                    아티스트
                  </div>
                  <button
                    className="text-[#666666] hover:text-[#888] transition"
                    aria-label="open"
                  >
                    <MdOutlineNavigateNext size={28} />
                  </button>
                </div>

                <div className="mt-5 relative">
                  <div ref={scrollRef} className="flex gap-8 overflow-x-auto pb-2">
                    {(artists.length ? artists : ALL_ARTISTS).map((a) => (
                      <div
                        key={a.id}
                        className="shrink-0 flex flex-col items-center"
                      >
                        <div className="w-28 h-28 rounded-full bg-[#D9D9D9]" />
                        <div className="mt-3 text-sm text-[#666666]">
                          {a.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {showLeft && (
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-[#F3F3F3] to-transparent" />
                  )}
                  {showRight && (
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#F3F3F3] to-transparent" />
                  )}
                </div>
              </section>
            )}

            {/* 앨범 섹션 */}
            {(tab === "모두" || tab === "앨범") && (
              <section className="rounded-3xl bg-[#F3F3F3] p-6">
                <div className="text-base font-semibold text-[#666666] text-center">
                  앨범
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(albums.length ? albums : ALL_ALBUMS).map((a) => (
                    <div
                      key={a.id}
                      className="rounded-2xl bg-white/60 p-4 hover:bg-white transition"
                    >
                      <div className="h-20 rounded-xl bg-[#D9D9D9]" />
                      <div className="mt-3 text-sm text-[#666666] truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-[#8A8A8A] truncate">
                        {a.artist}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 검색 결과 없음 */}
            {q && tab === "곡" && songs.length === 0 && (
              <div className="text-sm text-[#8A8A8A]">
                해당 검색어의 곡이 없습니다.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
