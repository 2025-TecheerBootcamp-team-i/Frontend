import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type Album = { id: string; title: string; artist: string };

const ALL_ALBUMS: Album[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  title: `앨범명 ${i + 1}`,
  artist: `아티스트명 ${((i % 6) + 1)}`,
}));

export default function SearchAlbum() {
  const [sp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  const albums = useMemo(() => {
    if (!q) return ALL_ALBUMS;
    const lower = q.toLowerCase();
    return ALL_ALBUMS.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.artist.toLowerCase().includes(lower)
    );
  }, [q]);

  return (
    <section className="w-full mt-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] px-8 py-10 min-h-[560px]">
      {/* 앨범 그리드 */}
      <div
        className="
          grid
          [grid-template-columns:repeat(4,220px)]
          justify-center
          gap-x-8 gap-y-12
        "
      >
        {albums.map((a) => (
          <button
            key={a.id}
            type="button"
            className="
              group
              rounded-2xl
              p-2
              flex flex-col items-center text-left
              transition
            "
          >
            {/* 앨범 커버 */}
            <div
              className="
                w-52 h-52
                rounded-2xl
                bg-[#777777]
                border border-[#464646]
                transition
                hover:shadow-[0_10px_28px_rgba(0,0,0,0.38)]
              "
            />

            {/* 텍스트 */}
            <div className="mt-4 w-full min-w-0">
              <div className="text-base font-semibold text-[#f6f6f6] truncate">
                {a.title}
              </div>
              <div className="mt-1 text-sm text-[#f6f6f6]/60 truncate">
                {a.artist}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 결과 없음 */}
      {q && albums.length === 0 && (
        <div className="mt-12 text-center text-sm text-[#8A8A8A]">
          <span className="text-[#f6f6f6]/80">{q}</span>에 해당하는 앨범이 없습니다.
        </div>
      )}
    </section>
  );
}
