import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type Artist = { id: string; name: string };

const ALL_ARTISTS: Artist[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  name: `아티스트명 ${i + 1}`,
}));

export default function SearchArtist() {
  const [sp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  const artists = useMemo(() => {
    if (!q) return ALL_ARTISTS;
    const lower = q.toLowerCase();
    return ALL_ARTISTS.filter((a) => a.name.toLowerCase().includes(lower));
  }, [q]);

  const gridItems = artists;

  return (
    <section className="w-full h-full flex flex-col rounded-3xl bg-[#2d2d2d]/80 px-10 py-12 min-h-[560px]">
        <div  className="
                grid
                grid-cols-[repeat(auto-fit,minmax(180px,1fr))]
                gap-x-10 gap-y-14
                overflow-auto
              "
            >
            {gridItems.map((a) => (
              <div key={a.id} className="w-full max-w-[300px] flex flex-col items-center">
                <div className="w-40  sm:w-44 md:w-48">
                  <div className="w-44 h-44 rounded-full bg-[#777777]" />
                  <div className="mt-6 text-lg font-semibold text-[#f6f6f6]">{a.name}</div>
                  <div className="mt-2 text-sm text-[#f6f6f6]">아티스트</div>
                </div>
              </div>
            ))}
        </div>

      {q && artists.length === 0 && (
        <div className="mt-10 text-center text-sm text-[#8A8A8A]">
          {q}에 해당 검색어의 아티스트가 없습니다.
        </div>
      )}
    </section>
  );
}
