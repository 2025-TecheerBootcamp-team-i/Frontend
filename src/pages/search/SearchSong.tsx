import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";

import { IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import {
  getPlaylistById,
  getUserPlaylists,
  subscribePlaylists,
  updatePlaylist,
  LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";

/* ===================== 타입 ===================== */

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  isAi?: boolean;
};

type SearchOutletCtx = {
  excludeAi: boolean;
  setExcludeAi: (v: boolean) => void;
};

/* ===================== 더미 데이터 ===================== */

const ALL_SONGS: Song[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  title: "곡 명",
  artist: "아티스트명",
  album: "앨범명",
  duration: "2:27",
  isAi: i % 4 === 0,
}));

/* ===================== 액션 ===================== */

const actions = [
  { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
  { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
  { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
  { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type ActionKey = (typeof actions)[number]["key"];

/* ===================== 컴포넌트 ===================== */

export default function SearchSong() {
  const { playTracks } = usePlayer();
  const { excludeAi, setExcludeAi } = useOutletContext<SearchOutletCtx>();
  const [sp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  /* ===================== 검색/필터 ===================== */

  const songs = useMemo(() => {
    let result = ALL_SONGS;

    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(lower) ||
          s.artist.toLowerCase().includes(lower) ||
          s.album.toLowerCase().includes(lower)
      );
    }

    if (excludeAi) result = result.filter((s) => !s.isAi);
    return result;
  }, [q, excludeAi]);

  /* ===================== 체크박스 ===================== */

  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const allChecked = songs.length > 0 && songs.every((s) => checkedIds[s.id]);
  const someChecked = songs.some((s) => checkedIds[s.id]) && !allChecked;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked;
    }
  }, [someChecked]);

  const toggleAll = (next: boolean) => {
    const obj: Record<string, boolean> = {};
    songs.forEach((s) => (obj[s.id] = next));
    setCheckedIds(obj);
  };

  const toggleOne = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ===================== 선택 트랙 ===================== */

  const toTrack = (s: Song): PlayerTrack => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    audioUrl: "/audio/sample.mp3",
  });

  const checkedSongs = useMemo(
    () => songs.filter((s) => checkedIds[s.id]),
    [songs, checkedIds]
  );

  const checkedTracks = useMemo(
    () => checkedSongs.map(toTrack),
    [checkedSongs]
  );

  const selectedCount = checkedTracks.length;

  /* ===================== 담기 모달 ===================== */

  const [addOpen, setAddOpen] = useState(false);
  const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

  useEffect(() => {
    const sync = () => setAddTargets(getUserPlaylists());
    sync();
    return subscribePlaylists(sync);
  }, []);

  const addSelectedToPlaylist = (playlistId: string) => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(playlistId);
    if (!curr) return;

    const incoming = checkedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album ?? "",
      duration: t.duration ?? "0:00",
      likeCount: 0,
      kind: "track" as const,
    }));

    const exists = new Set(curr.tracks.map((x) => x.id));
    const merged = [...curr.tracks];

    for (const tr of incoming) {
      if (exists.has(tr.id)) continue;
      merged.push(tr);
      exists.add(tr.id);
    }

    updatePlaylist(playlistId, { tracks: merged });
    setAddOpen(false);
    setCheckedIds({});
  };

  const addSelectedToLiked = () => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(LIKED_SYSTEM_ID);
    if (!curr) return;

    const incoming = checkedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album ?? "",
      duration: t.duration ?? "0:00",
      likeCount: 0,
      kind: "track" as const,
    }));

    const exists = new Set(curr.tracks.map((x) => x.id));
    const merged = [...curr.tracks];

    for (const tr of incoming) {
      if (exists.has(tr.id)) continue;
      merged.push(tr);
      exists.add(tr.id);
    }

    updatePlaylist(LIKED_SYSTEM_ID, { tracks: merged });
    setCheckedIds({});
  };

  /* ===================== 액션 ===================== */

  const handleAction = (key: ActionKey) => {
    if (selectedCount === 0) return;

    if (key === "play") playTracks(checkedTracks);
    if (key === "shuffle") playTracks(checkedTracks, { shuffle: true });
    if (key === "add") setAddOpen(true);
    if (key === "like") addSelectedToLiked();
  };

  /* ===================== JSX ===================== */

  return (
    <section className="mt-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-5 pb-4 border-b border-[#464646] overflow-x-auto whitespace-nowrap">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[#F6F6F6]">곡</h2>
            <div className="text-sm text-[#999]">총 {songs.length}곡</div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setExcludeAi(!excludeAi)}
            className={[
              "shrink-0 px-4 py-2 rounded-2xl text-sm flex items-center gap-2 outline outline-1",
              excludeAi
                ? "bg-[#f6f6f6] text-[#4e4e4e]"
                : "outline-[#f6f6f6] text-[#f6f6f6]",
            ].join(" ")}
          >
            <FaCheckCircle size={18} />
            AI 제외
          </button>

          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleAction(a.key)}
              className={[
                "px-4 py-2 rounded-2xl outline outline-1 text-sm flex items-center gap-2",
                selectedCount === 0
                  ? "text-white/30 cursor-not-allowed"
                  : "text-[#F6F6F6] hover:bg-white/10",
              ].join(" ")}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* 리스트 헤더 */}
      <div className="px-6 pt-4 border-b border-[#464646]">
        <div className="px-4 grid grid-cols-[28px_56px_1fr_90px] gap-x-4 pb-3 text-xs text-[#F6F6F6]/60">
          <input
            ref={selectAllRef}
            type="checkbox"
            className="accent-[#f6f6f6]"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <div className="col-span-2 px-2 border-l border-[#464646]">곡정보</div>
          <div className="text-right px-2 border-r border-[#464646]">길이</div>
        </div>
      </div>

      {/* 리스트 */}
      <div className="px-4 divide-y divide-[#464646]">
        {songs.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-[28px_56px_1fr_90px] items-center gap-x-4 px-6 py-3 hover:bg-white/5"
          >
            <input
              type="checkbox"
              className="accent-[#f6f6f6]"
              checked={!!checkedIds[s.id]}
              onChange={() => toggleOne(s.id)}
            />

            <div className="ml-1 w-10 h-10 rounded-xl bg-[#6b6b6b]/50" />

            <div className="min-w-0">
              <div className="text-sm text-[#F6F6F6] truncate">
                {s.title}
                {s.isAi && (
                  <span className="ml-2 text-xs px-2 py-[1px] rounded-full bg-[#E4524D]/20 text-[#E4524D]">
                    AI
                  </span>
                )}
              </div>
              <div className="text-xs text-[#999] truncate">{s.artist}</div>
            </div>

            <div className="mr-1 text-sm text-[#F6F6F6]/70 text-right">{s.duration}</div>
          </div>
        ))}
      </div>

      {/* ✅ 담기 모달 */}
      {addOpen && (
            <div className="fixed inset-0 z-[999] whitespace-normal">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setAddOpen(false)}
                aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                    <div className="text-base font-semibold text-[#F6F6F6]">플레이리스트 선택</div>
                    <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                    >
                    ✕
                    </button>
                </div>

                <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">
                    선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
                </div>

                <div className="max-h-[360px] overflow-y-auto border-t border-[#464646]">
                    {addTargets.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-[#aaa]">
                        담을 수 있는 플레이리스트가 없어요.
                        <div className="mt-2 text-xs text-[#777]">(liked 같은 시스템 플리는 제외됨)</div>
                    </div>
                    ) : (
                    addTargets.map((p) => (
                        <button
                        key={p.id}
                        type="button"
                        onClick={() => addSelectedToPlaylist(p.id)}
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                        >
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">{p.title}</div>
                        <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                            {p.owner} · {p.isPublic ? "공개" : "비공개"}
                        </div>
                        </button>
                    ))
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                    <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="px-4 py-2 rounded-2xl text-sm text-[#F6F6F6] hover:bg-white/10 transition"
                    >
                    취소
                    </button>
                </div>
                </div>
            </div>
            </div>
      )}
    </section>
  );
}
