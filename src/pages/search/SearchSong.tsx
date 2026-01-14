import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MdAccessTime,
  MdOutlineKeyboardArrowDown,
} from "react-icons/md";

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string; // "2:27"
};

const ALL_SONGS: Song[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  title: "곡 명",
  artist: "아티스트명",
  album: "앨범명",
  duration: "2:27",
}));

export default function SearchSong() {
  const [sp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  // ✅ 검색어(q)로 곡명/아티스트/앨범 모두 필터
  const songs = useMemo(() => {
    if (!q) return ALL_SONGS;
    const lower = q.toLowerCase();
    return ALL_SONGS.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower) ||
        s.album.toLowerCase().includes(lower)
    );
  }, [q]);

  // ✅ 체크박스(선택) 상태
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visibleIds = useMemo(() => songs.map((s) => s.id), [songs]);
  const allChecked =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked =
    visibleIds.some((id) => selected.has(id)) && !allChecked;

  // ✅ indeterminate(일부만 체크) 표시
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  return (
    <section className="rounded-3xl bg-[#F3F3F3] p-6 min-h-[560px]">

      {/* ✅ 리스트 컨테이너 */}
      <div className="rounded-2xl overflow-hidden bg-[#F3F3F3]">
        {/* 헤더 */}
        <div
          className="
            grid items-center
            grid-cols-[36px_52px_minmax(0,1fr)_56px]
            sm:grid-cols-[36px_52px_minmax(0,1.6fr)_minmax(0,1fr)_56px]
            px-4 py-3
            text-xs text-[#8A8A8A]
            border-b border-[#e2e2e2]
          "
        >
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allChecked}
            onChange={toggleAllVisible}
            aria-label="select all"
            className="h-4 w-4 accent-[#6B6B6B]"
          />

          {/* 커버 헤더 자리(빈칸) */}
          <div />

          {/* 곡정보 + 정렬 화살표 느낌 */}
          <div className="flex items-center gap-1 text-[1em]">
            <span>곡정보</span>
            <MdOutlineKeyboardArrowDown/>
          </div>

          {/* 앨범 헤더(작은 화면에선 숨김) */}
          <div className="hidden sm:block text-center">앨범</div>

          {/* 시간 아이콘 */}
          <div className="flex justify-end text-[1em]">
            <MdAccessTime/>
          </div>
        </div>

        {/* 바디(행들) */}
        <div className="divide-y divide-[#e2e2e2]">
          {songs.map((s) => (
            <div
              key={s.id}
              className="
                grid items-center
                grid-cols-[36px_52px_minmax(0,1fr)_56px]
                sm:grid-cols-[36px_52px_minmax(0,1.6fr)_minmax(0,1fr)_56px]
                px-4 py-3
                hover:bg-white transition
              "
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggleOne(s.id)}
                aria-label={`select ${s.title}`}
                className="h-4 w-4 accent-[#6B6B6B]"
              />

              {/* 커버 */}
              <div className="h-10 w-10 rounded-xl bg-[#D9D9D9]" />

              {/* 곡정보(곡명/아티스트명) */}
              <div className="min-w-0">
                <div className="text-sm text-[#666666] truncate">{s.title}</div>
                <div className="text-xs text-[#8A8A8A] truncate">{s.artist}</div>
              </div>

              {/* 앨범명 */}
              <div className="hidden sm:block text-center text-sm text-[#8A8A8A] truncate">
                {s.album}
              </div>

              {/* 재생시간 */}
              <div className="text-right text-sm text-[#8A8A8A]">{s.duration}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 검색 결과 없음 */}
      {q && songs.length === 0 && (
        <div className="mt-10 text-center text-sm text-[#8A8A8A]">
          해당 검색어의 곡이 없습니다.
        </div>
      )}
    </section>
  );
}