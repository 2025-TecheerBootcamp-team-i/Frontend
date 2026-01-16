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

  return (
    <section className="w-full mt-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] px-8 py-10 min-h-[560px]">
      {/* 아티스트 그리드 */}
      <div
        className="
          grid
          [grid-template-columns:repeat(4,220px)]
          justify-center
          gap-x-8 gap-y-12
        "
      >
        {artists.map((a) => (
          <button
            key={a.id}
            type="button"
            className="
              group
              rounded-2xl
              p-2
              flex flex-col items-center text-center
              transition
            "
          >
            {/* 썸네일 */}
            <div
              className="
                w-52 h-52
                rounded-full
                bg-[#777777]
                border border-[#464646]
                transition
                hover:shadow-[0_10px_28px_rgba(0,0,0,0.38)]
              "
            />

            {/* 텍스트 */}
            <div className="mt-5 text-base font-semibold text-[#f6f6f6] truncate w-full">
              {a.name}
            </div>
            <div className="mt-1 text-sm text-[#f6f6f6]/60">아티스트</div>
          </button>
        ))}
      </div>

      {/* 결과 없음 */}
      {q && artists.length === 0 && (
        <div className="mt-12 text-center text-sm text-[#8A8A8A]">
          <span className="text-[#f6f6f6]/80">{q}</span>에 해당하는 아티스트가 없습니다.
        </div>
      )}
    </section>
  );
}
