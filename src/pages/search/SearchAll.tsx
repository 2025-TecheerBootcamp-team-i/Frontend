// src/pages/search/SearchHome.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdOutlineNavigateNext, MdPlayArrow, MdMoreVert } from "react-icons/md";

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

  // ✅ 아티스트 가로 스크롤 그라데이션
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

  return (
    <div className="space-y-6">
      {/* ✅ 상단 2열 */}
      <div className="
    grid gap-6
    grid-cols-1
    lg:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1.2fr)]
  ">
        {/* 대표 카드 */}
        <section className="rounded-3xl bg-[#F3F3F3] p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col">
              <div className="h-44 w-44 rounded-2xl bg-[#D9D9D9]" />
              <div className="mt-4">
                <div className="text-lg font-semibold text-[#666666]">
                  {featured ? "곡 또는 아티스트명" : "곡 또는 아티스트명"}
                </div>
                <div className="mt-2 text-sm text-[#8A8A8A]">
                  {featured ? "분류 (곡 or 아티스트)" : "분류 (곡 or 아티스트)"}
                </div>
              </div>
            </div>

            <div className="ml-auto self-end">
              <button
                type="button"
                className="flex items-center justify-center rounded-full
                bg-[#6B6B6B] text-white hover:bg-[#5A5A5A]
                w-[clamp(40px,4vw,56px)] h-[clamp(40px,4vw,56px)]
                text-[clamp(24px,2.2vw,40px)]"
                aria-label="play"
              >
                <MdPlayArrow size={40} />
              </button>
            </div>
          </div>
        </section>

        {/* 곡 리스트 카드 */}
        <section className="rounded-3xl bg-[#F3F3F3] p-6">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-[#666666]">곡</div>

            <button
              type="button"
              onClick={() => navigate(`/search/song${search}`)}
              className="text-[#666666] hover:text-[#888] transition"
              aria-label="open"
            >
              <MdOutlineNavigateNext size={28} />
            </button>
          </div>

          <div className="mt-4 divide-y divide-[#e2e2e2] rounded-2xl overflow-hidden">
            {(songs.length ? songs : ALL_SONGS).slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-3 hover:bg-white transition"
              >
                <div className="h-10 w-10 rounded-xl bg-[#D9D9D9]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-[#666666]">{s.title}</div>
                  <div className="truncate text-xs text-[#8A8A8A]">{s.artist}</div>
                </div>
                <div className="w-12 text-right text-sm text-[#8A8A8A]">
                  {s.duration}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-center text-[#8A8A8A]">
            <button type="button" aria-label="more">
              <MdMoreVert size={20} />
            </button>
          </div>

          {q && songs.length === 0 && (
            <div className="mt-3 text-sm text-[#8A8A8A]">
              해당 검색어의 곡이 없습니다.
            </div>
          )}
        </section>
      </div>

      {/* ✅ 아티스트 미리보기 */}
      <section className="rounded-3xl bg-[#F3F3F3] p-6">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-[#666666]">아티스트</div>
          <button
            type="button"
            onClick={() => navigate(`/search/artist${search}`)}
            className="text-[#666666] hover:text-[#888] transition"
            aria-label="open"
          >
            <MdOutlineNavigateNext size={28} />
          </button>
        </div>

        <div className="mt-4 relative">
          <div ref={scrollRef} className="flex gap-8 overflow-x-auto pb-2">
            {(artists.length ? artists : ALL_ARTISTS).slice(0, 6).map((a) => (
              <div key={a.id} className="shrink-0 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-[#D9D9D9]" />
                <div className="mt-3 text-sm font-semibold text-[#666666]">{a.name}</div>
                <div className="mt-1 text-xs text-[#8A8A8A]">아티스트</div>
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

        {q && artists.length === 0 && (
          <div className="mt-3 text-sm text-[#8A8A8A]">
            해당 검색어의 아티스트가 없습니다.
          </div>
        )}
      </section>

      {/* ✅ 앨범 미리보기 */}
      <section className="rounded-3xl bg-[#F3F3F3] p-6">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-[#666666]">앨범</div>
          <button
            type="button"
            onClick={() => navigate(`/search/album${search}`)}
            className="text-[#666666] hover:text-[#888] transition"
            aria-label="open"
          >
            <MdOutlineNavigateNext size={28} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(albums.length ? albums : ALL_ALBUMS).slice(0, 8).map((a) => (
            <div key={a.id} className="rounded-2xl bg-white/60 p-4 hover:bg-white transition">
              <div className="h-20 rounded-xl bg-[#D9D9D9]" />
              <div className="mt-3 text-sm text-[#666666] truncate">{a.name}</div>
              <div className="text-xs text-[#8A8A8A] truncate">{a.artist}</div>
            </div>
          ))}
        </div>

        {q && albums.length === 0 && (
          <div className="mt-3 text-sm text-[#8A8A8A]">
            해당 검색어의 앨범이 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}
