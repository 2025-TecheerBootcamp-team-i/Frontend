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
    <section className="w-full h-full flex flex-col rounded-3xl bg-transparent p-4 min-h-[560px]">
    <div className="space-y-6 overflow-auto">
      {/* ✅ 상단 2열 */}
      <div className="
    grid gap-6
    grid-cols-1
    lg:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1.2fr)]
  ">
        {/* 대표 카드 */}
        <section
          className="
            group
            rounded-3xl bg-[#2d2d2d]/80 p-8
            transition-colors
             hover:bg-black/20
          "
          >
          {/* 2열: 왼쪽 커버 / 오른쪽 텍스트 */}
          <div className="grid grid-cols-[176px_minmax(0,1fr)] gap-14 items-start">
            {/* 커버 */}
            <div className="w-52 h-52 rounded-2xl bg-[#7777]" />

            {/* 오른쪽 영역: 텍스트 + 버튼(우하단) */}
            <div className="min-w-0 flex flex-col h-full">
              {/* 텍스트 (오른쪽에 위치) */}
              <div className="min-w-0">
                <div className="text-xl font-semibold text-[#f6f6f6] truncate">
                  {featured ? "곡 또는 아티스트명" : "곡 또는 아티스트명"}
                </div>
                <div className="mt-2 text-sm font-normal text-[#f6f6f6] truncate">
                  {featured ? "분류 (곡 or 아티스트)" : "분류 (곡 or 아티스트)"}
                </div>
              </div>

              {/* 버튼: 오른쪽 아래로 밀기 */}
              <div className="mt-auto flex justify-end">
                <button
                  type="button"
                  aria-label="play"
                  className="
                    flex items-center justify-center rounded-full
                    bg-[#AFDEE2] text-[#2d2d2d]
                    w-[clamp(40px,4vw,56px)] h-[clamp(40px,4vw,56px)]
                    shadow-[0_12px_20px_rgba(0,0,0,0.35)]
                    transition
                    opacity-0 translate-y-3 pointer-events-none
                    group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                    hover:bg-opacity-70
                    hover:scale-[1.03]
                    
                  "
                >
                  <MdPlayArrow size={40} />
                </button>
              </div>
            </div>
          </div>
        </section>


        {/* 곡 리스트 카드 */}
        <section className="rounded-3xl bg-[#2d2d2d]/80 p-6">
          <div className="flex items-center justify-between">
            <div className="mx-4 text-xl font-semibold text-[#f6f6f6]">곡</div>
            <button
              type="button"
              onClick={() => navigate(`/search/song${search}`)}
              className="text-[#f6f6f6] hover:text-[#888] text-xl leading-none"
              aria-label="open"
            >
              <MdOutlineNavigateNext size={40} />
            </button>
          </div>

          {/* 없는게 훨씬 괜찮은 것 같아서 뺐는데 어떠신가요? */}
          {/* <div className="mx-4 border-t border-[#464646]" /> */}

          <div className="-mx-6 -mb-4 divide-y divide-[#464646] rounded-2xl">
            {(songs.length ? songs : ALL_SONGS).slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-12 py-4 hover:bg-black/20 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-[#777777]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-[#f6f6f6]">{s.title}</div>
                  <div className="truncate text-xs text-[#f6f6f6]">{s.artist}</div>
                </div>
                <div className="w-12 text-right text-sm text-[#f6f6f6]">
                  {s.duration}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-center text-[#f6f6f6]">
            <button type="button" aria-label="more"
            onClick={() => navigate(`/search/song${search}`)}>
              <MdMoreVert size={24} />
            </button>
          </div>

          {q && songs.length === 0 && (
            <div className="mt-3 text-sm text-[#f6f6f6]">
              해당 검색어의 곡이 없습니다.
            </div>
          )}
        </section>
      </div>

      {/* ✅ 아티스트 미리보기 */}
      <section className="rounded-3xl bg-[#2d2d2d]/80 p-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-[#f6f6f6]">아티스트</div>
          <button
            type="button"
            onClick={() => navigate(`/search/artist${search}`)}
            className="text-[#f6f6f6] hover:text-[#888] text-xl leading-none"
            aria-label="open"
          >
            <MdOutlineNavigateNext size={40} />
          </button>
        </div>

        <div className="mt-4 relative">
          <div ref={scrollRef} className="flex gap-8 overflow-x-auto pb-2">
            {(artists.length ? artists : ALL_ARTISTS).slice(0, 6).map((a) => (
              <div key={a.id} className="shrink-0 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-[#777777]" />
                <div className="mt-3 text-sm font-semibold text-[#f6f6f6]">{a.name}</div>
                <div className="mt-1 text-xs text-[#f6f6f6]">아티스트</div>
              </div>
            ))}
          </div>

          {showLeft && (
            <div className="pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-[#F3F3F3]" />
          )}
          {showRight && (
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#F3F3F3] to-transparent" />
          )}
        </div>

        {q && artists.length === 0 && (
          <div className="mt-3 text-sm text-[#f6f6f6]">
            해당 검색어의 아티스트가 없습니다.
          </div>
        )}
      </section>

      {/* ✅ 앨범 미리보기 */}
      <section className="rounded-3xl bg-[#2d2d2d]/80 p-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-[#f6f6f6]">앨범</div>
          <button
            type="button"
            onClick={() => navigate(`/search/album${search}`)}
            className="text-[#f6f6f6] hover:text-[#888] transition"
            aria-label="open"
          >
            <MdOutlineNavigateNext size={40} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
          {(albums.length ? albums : ALL_ALBUMS).slice(0, 6).map((a) => (
            <div key={a.id} className="w-52 h-52 aspect-square rounded-2xl bg-[#777777] p-4">
              <div className="mt-3 text-sm text-[#f6f6f6] truncate">{a.name}</div>
              <div className="text-xs text-[#f6f6f6] truncate">{a.artist}</div>
            </div>
          ))}
        </div>

        {q && albums.length === 0 && (
          <div className="mt-3 text-sm text-[#f6f6f6]">
            해당 검색어의 앨범이 없습니다.
          </div>
        )}
      </section>
    </div>
  </section>
  );
}
