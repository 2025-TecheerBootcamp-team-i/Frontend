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

    // ✅ 앨범명/아티스트명 둘 다 검색되게
    return ALL_ALBUMS.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.artist.toLowerCase().includes(lower)
    );
  }, [q]);

  return (
    <section className="rounded-3xl bg-[#F3F3F3] px-10 py-12 min-h-[560px]">
      <div
        className="
          grid
          grid-cols-[repeat(auto-fit,minmax(200px,1fr))]
          gap-x-10 gap-y-14
          justify-items-center
        "
      >
        {albums.map((a) => (
          <div key={a.id} className="w-full max-w-[260px]">
            {/* ✅ 앨범 커버: 원형이 아니라 정사각 + 둥근 모서리 */}
            <div className="aspect-square w-full rounded-2xl bg-[#D9D9D9]" />

            {/* ✅ 이미지처럼: 앨범명(굵게) / 아티스트(작게) */}
            <div className="mt-4">
              <div className="text-base font-semibold text-[#666666]">
                {a.title}
              </div>
              <div className="mt-1 text-sm text-[#8A8A8A]">{a.artist}</div>
            </div>
          </div>
        ))}
      </div>

      {q && albums.length === 0 && (
        <div className="mt-10 text-center text-sm text-[#8A8A8A]">
          해당 검색어의 앨범이 없습니다.
        </div>
      )}
    </section>
  );
}
