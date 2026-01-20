import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import {
  getAllAiSongs,
  subscribeAiSongs,
  createAiSong,
} from "../../mocks/aiSongMock";
import type { AiTrack } from "../../mocks/aiSongMock";

import {
  getPlaylistById,
  getUserPlaylists,
  subscribePlaylists,
  updatePlaylist,
} from "../../mocks/playlistMock";

import {
  MdSearch,
  MdPlaylistAdd,
  MdShare,
  MdMusicNote,
  MdAdd,
  MdOutlineNavigateNext,
} from "react-icons/md";
import { IoChevronBack, IoShuffle } from "react-icons/io5";

function PillButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="
        shrink-0 px-4 py-2 rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-500
        text-sm transition flex items-center gap-2
        disabled:text-white/30 disabled:cursor-not-allowed disabled:hover:bg-transparent
        hover:bg-[#f6f6f6]/10"
    >
      <span className="text-base">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function AiCreatePage() {
  const navigate = useNavigate();
  const { playTracks } = usePlayer();

  /** =========================
   * ✅ 커버 업로드
   ========================= */
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [coverUrl]);

  const onPickCover = () => {
    fileRef.current?.click();
  };

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있어요.");
      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("파일 용량은 5MB 이하로 업로드해 주세요.");
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverUrl(url);
    e.target.value = "";
  };

  /** =========================
   * ✅ 좌측 입력
   ========================= */
  const [prompt, setPrompt] = useState("");
  const maxPrompt = 1500;

  /** =========================
   * ✅ 우측 리스트(업로드된 곡만)
   ========================= */
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AiTrack[]>([]);

  useEffect(() => {
    const sync = () => setRows(getAllAiSongs());
    sync();
    return subscribeAiSongs(sync);
  }, []);

  const filtered = useMemo(() => {
    const uploaded = rows.filter((r) => r.status === "Upload");

    const q = query.trim().toLowerCase();
    if (!q) return uploaded;

    return uploaded.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q)
    );
  }, [query, rows]);

  /** =========================
   * ✅ 선택 체크
   ========================= */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allChecked =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked =
    visibleIds.some((id) => selected.has(id)) && !allChecked;

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
      if (allChecked) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  /** =========================
   * ✅ 생성: 생성 후 "나의 AI 곡 목록"으로 이동
   ========================= */
  const CURRENT_USER_ID = "me";
  const CURRENT_USER_NAME = "나";

  const handleCreateSong = () => {
    if (!prompt.trim()) return;

    createAiSong({
      title: "새 AI 곡",
      desc: "AI로 생성한 곡",
      prompt,
      coverUrl: coverUrl ?? undefined,
      ownerId: CURRENT_USER_ID,
      ownerName: CURRENT_USER_NAME,
      status: "Draft",
    });

    // ✅ 생성 후: "나의 AI 곡 목록"으로 이동
    navigate("/my/ai-songs");

    // (선택) 입력 초기화
    setPrompt("");
    setSelected(new Set());
  };

  /** =========================
   * ✅ 선택된 row → PlayerTrack
   ========================= */
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected]
  );

  const toTrack = (r: AiTrack): PlayerTrack => ({
    id: r.id,
    title: r.title,
    artist: "AI Artist",
    duration: r.duration,
    audioUrl: "/audio/sample.mp3",
  });

  const selectedTracks = useMemo(
    () => selectedRows.map(toTrack),
    [selectedRows]
  );

  const selectedCount = selectedTracks.length;

  /** =========================
   * ✅ 담기 모달 (중복 선언 제거 완료)
   ========================= */
  const [addOpen, setAddOpen] = useState(false);
  const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

  useEffect(() => {
    const syncTargets = () => setAddTargets(getUserPlaylists());
    syncTargets();
    return subscribePlaylists(syncTargets);
  }, []);

  const addSelectedToPlaylist = (playlistId: string) => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(playlistId);
    if (!curr) return;

    const incoming = selectedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: "",
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
    setSelected(new Set());
  };

  /** =========================
   * ✅ 공유
   ========================= */
  const shareSelected = async () => {
    if (selectedCount === 0) return;

    const text = selectedRows
      .map((r) => `- ${r.title} (${r.duration})`)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI 곡 공유",
          text,
        });
        return;
      }
    } catch {
      // ignore
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("선택한 곡 목록을 클립보드에 복사했어요!");
    } catch {
      alert("공유에 실패했어요. (클립보드 권한 확인)");
    }
  };

  type ActionKey = "play" | "shuffle" | "add" | "share";

  const handleAction = (key: ActionKey) => {
    if (selectedCount === 0) return;

    if (key === "play") playTracks(selectedTracks);
    if (key === "shuffle") playTracks(selectedTracks, { shuffle: true });
    if (key === "add") setAddOpen(true);
    if (key === "share") shareSelected();
  };

  const goToAlSongPage = (trackId: string) => {
    navigate(`/aisong/${trackId}`);
  };

  return (
    <div className="w-full h-full overflow-x-auto">
      <div className="grid min-h-screen items-stretch grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.05fr)] gap-6">
        {/* ===================== 좌측: 생성 폼 ===================== */}
        <section>
          {/* 상단: 뒤로가기 + 타이틀 */}
          <div className="flex pt-2 place-items-start">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
              className="p-2 text-[#f6f6f6] rounded-full hover:bg-white/10 transition"
            >
              <IoChevronBack size={22} />
            </button>

            <div className="flex-1 flex justify-center">
              <h1 className="mr-10 mt-10 text-3xl font-semibold leading-tight text-[#f6f6f6]">
                나만의 노래를
                <br />
                AI로 만들어보세요!
              </h1>
            </div>
          </div>

          {/* 커버 업로드 카드 */}
          <div className="mt-14 flex flex-col items-center">
            <button
              type="button"
              onClick={onPickCover}
              className="w-72 h-72 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.25)] bg-[#3d3d3d]/90 hover:bg-[#3d3d3d]/40 transition flex flex-col items-center justify-center overflow-hidden"
              aria-label="add cover"
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="cover preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="text-[#f6f6f6]">
                    <MdAdd size={26} />
                  </div>
                  <span className="text-sm text-[#f6f6f6]">
                    나만의 커버 사진 추가하기
                  </span>
                </>
              )}
            </button>
          </div>

          <div>
            <p className="mt-2 text-[11px] text-center text-[#9d9d9d] leading-relaxed">
              커버 사진을 추가하지 않아도 AI가 자동으로 생성해줍니다.
            </p>
          </div>

          {/* 실제 업로드 input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onCoverChange}
            className="hidden"
          />

          {/* 프롬프트 카드 */}
          <div className="mt-10 mx-4 rounded-2xl bg-[#3d3d3d]/80 backdrop-blur-xl border border-[#3d3d3d] shadow-[0_4px_12px_rgba(0,0,0,0.25)] p-5">
            <div className="p-2 text-sm font-semibold text-[#f6f6f6]">
              AI 노래 프롬프트
            </div>

            <div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, maxPrompt))}
                placeholder="예) 새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬..."
                className="placeholder-[#777777] mt-2 p-2 w-full resize-none bg-transparent text-sm text-[#f6f6f6] outline-none min-h-[180px]"
              />
              <div className="mt-2 text-right text-[11px] text-[#888888]">
                {prompt.length}/{maxPrompt}
              </div>
            </div>
          </div>

          {/* 생성 버튼 */}
          <div className="mt-6 mb-4 flex justify-center">
            <button
              type="button"
              disabled={!prompt.trim()}
              onClick={handleCreateSong}
              className="
                px-4 py-3
                rounded-2xl
                text-sm
                bg-[#AFDEE2]
                text-[#1f2a2b]
                hover:bg-[#87B2B6]
                active:scale-[0.97]
                transition
                disabled:bg-[#5f7f83]
                disabled:text-[#cfd8da]
                disabled:cursor-not-allowed
                disabled:active:scale-100"
            >
              <div className="flex gap-2 items-center">
                <MdMusicNote size={18} />
                AI 노래 생성하기
              </div>
            </button>
          </div>
        </section>

        {/* ===================== 우측: 리스트/테이블 ===================== */}
        <section className="
            -mb-24 rounded-2xl bg-[#2d2d2d]/80 bg-gradient-to-tr
            shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-[#2d2d2d] overflow-hidden text-[#f6f6f6]">
          <div className="px-8 py-6 border-b border-[#464646]">
            {/* 검색바 */}
            <div className="flex items-center gap-3 rounded-full bg-[#3d3d3d] px-4 py-2 text-[#666666]">
              <MdSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="AI 곡 검색하기"
                className="w-full bg-transparent text-[#f6f6f6] text-sm outline-none placeholder:text-[#666666]"
              />
            </div>

            {/* 액션 버튼들 */}
            <div className="mt-4 flex items-center justify-between gap-4 text-[#f6f6f6]">
              <div className="flex flex-nowrap gap-3">
                <PillButton
                  icon={<MdMusicNote />}
                  label="재생"
                  onClick={() => handleAction("play")}
                  disabled={selectedCount === 0}
                />
                <PillButton
                  icon={<IoShuffle />}
                  label="셔플"
                  onClick={() => handleAction("shuffle")}
                  disabled={selectedCount === 0}
                />
                <PillButton
                  icon={<MdPlaylistAdd />}
                  label="담기"
                  onClick={() => handleAction("add")}
                  disabled={selectedCount === 0}
                />
                <PillButton
                  icon={<MdShare />}
                  label="공유"
                  onClick={() => handleAction("share")}
                  disabled={selectedCount === 0}
                />
              </div>

              {/* 오른쪽 끝: 목록 이동 */}
              <button
                type="button"
                onClick={() => navigate("/my/ai-songs")}
                className="
                  shrink-0
                  flex items-center
                  text-sm font-semibold
                  text-[#F6F6F6]/80
                  hover:text-white
                  transition
                "
                aria-label="나의 AI 생성곡 목록으로 이동"
                title="나의 AI 생성곡 목록"
              >
                나의 AI 생성곡
                <MdOutlineNavigateNext
                  size={24}
                  className="translate-y-[1px] opacity-80 group-hover:opacity-100 transition"
                />
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="mt-0">
            <div className="grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-3 text-[12px] text-white/55">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={toggleAllVisible}
                aria-label="select all"
                className="ml-2 accent-[#f6f6f6]"
              />

              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">
                곡정보
              </div>
              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">
                길이
              </div>
              <div className="pr-2 border-r border-[#E6E6E6]/20 text-[#f6f6f6] text-right">
                생성 일시
              </div>
            </div>

            <div className="border-b border-[#464646]" />

            <div className="divide-y divide-[#464646]">
              {filtered.map((r, idx) => (
                <div
                  key={r.id}
                  className={[
                    "grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-3 transition group",
                    idx % 2 === 0 ? "bg-[#2d2d2d]/80" : "bg-[#3b3b3b]/80",
                    "hover:bg-white/5",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`select ${r.title}`}
                    className="ml-2 accent-[#f6f6f6]"
                  />

                  <div className="pl-2 border-l border-[#E6E6E6]/20 min-w-0 flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-xl bg-white/20 shrink-0" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => goToAlSongPage(r.id)}
                        className="block w-full truncate text-left text-[12px] text-[#f6f6f6] hover:underline underline-offset-2"
                      >
                        {r.title}
                      </button>
                      <div className="truncate text-[12px] text-[#999999]">
                        {r.desc}
                      </div>
                    </div>
                  </div>

                  <div className="pl-2 border-l border-[#E6E6E6]/20 text-left text-xs text-[#f6f6f6]">
                    {r.duration}
                  </div>

                  <div className="pr-2 border-r border-[#E6E6E6]/20 text-right text-xs text-[#f6f6f6]">
                    {r.createdAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="px-8 py-10 text-center text-sm text-[#f6f6f6] whitespace-normal">
              {query}에 대한 검색 결과가 없습니다.
            </div>
          )}
        </section>

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
                  <div className="text-base font-semibold text-[#F6F6F6]">
                    플레이리스트 선택
                  </div>
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
                      <div className="mt-2 text-xs text-[#777]">
                        (liked 같은 시스템 플리는 제외됨)
                      </div>
                    </div>
                  ) : (
                    addTargets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addSelectedToPlaylist(p.id)}
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                      >
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                          {p.title}
                        </div>
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
      </div>
    </div>
  );
}
