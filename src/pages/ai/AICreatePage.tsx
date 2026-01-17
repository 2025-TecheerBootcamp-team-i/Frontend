import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

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
  MdAdd
} from "react-icons/md";
import { IoChevronBack, IoShuffle } from "react-icons/io5";



type AiTrack = {
  id: string;
  status: "Upload" | "Draft";
  title: string;
  desc: string;
  duration: string; // "2:27"
  createdAt: string; // "2026년 1월 10일"
  isAi: boolean;
};


const DUMMY_TRACKS: AiTrack[] = [
  {
    id: "t1",
    status: "Upload",
    title: "테커의 새벽",
    desc: "rap, Boom-bap inspired...",
    duration: "2:27",
    createdAt: "2026년 1월 10일",
    isAi: true,
  },
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `t${i + 2}`,
    status: "Draft" as const,
    title: "곡 이름",
    desc: "곡 설명",
    duration: "2:27",
    createdAt: "2026년 1월 10일",
    isAi: true,
  })),
];

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
        hover:bg-[#f6f6f6]/10">
      <span className="text-base">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function AiCreatePage() {

  // ✅ 커버 이미지 업로드용: input을 클릭시키기 위한 ref + 미리보기 URL 상태
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
        if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
    }, [coverUrl]);

  
  // ✅ 버튼 눌렀을 때 숨겨진 input을 클릭해서 파일 선택창을 여는 함수
const onPickCover = () => {
  fileRef.current?.click();
};

// ✅ 파일 선택이 끝났을 때(= 사용자가 파일을 고른 순간) 실행되는 함수
const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ 이미지 파일만 허용
  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 업로드할 수 있어요.");
    e.target.value = "";
    return;
  }

  // (선택) 용량 제한 예: 5MB
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("파일 용량은 5MB 이하로 업로드해 주세요.");
    e.target.value = "";
    return;
  }

  // ✅ 미리보기용 임시 URL 생성
  const url = URL.createObjectURL(file);
  setCoverFile(file);   // 나중에 서버 업로드할 때 사용
  setCoverUrl(url);     // 화면에 미리보기로 사용

  // ✅ 같은 파일을 다시 선택해도 change가 발생하도록 초기화
  e.target.value = "";
};

  // ✅ 좌측: 프롬프트/커버 상태
  const [prompt, setPrompt] = useState("");
  const maxPrompt = 1500;

  // ✅ 우측: 검색/선택 상태
  const [query, setQuery] = useState("");
  const [rows] = useState<AiTrack[]>(DUMMY_TRACKS);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    );
  }, [query, rows]);

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

  const navigate = useNavigate();
  const { playTracks } = usePlayer();

  // ✅ 선택된 row들
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected]
  );

  // ✅ AiTrack -> PlayerTrack 변환 (재생/셔플용)
  const toTrack = (r: AiTrack): PlayerTrack => ({
    id: r.id,
    title: r.title,
    artist: "AI Artist",         // 지금 AiTrack에 artist가 없어서 임시
    duration: r.duration,
    audioUrl: "/audio/sample.mp3", // 임시
    // coverUrl 필요하면 추가
  });

  const selectedTracks = useMemo(
    () => selectedRows.map(toTrack),
    [selectedRows]
  );

  const selectedCount = selectedTracks.length;

  // ✅ 담기 모달 상태
  const [addOpen, setAddOpen] = useState(false);
  const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

  useEffect(() => {
    const syncTargets = () => setAddTargets(getUserPlaylists());
    syncTargets();
    return subscribePlaylists(syncTargets);
  }, []);

  // ✅ 담기(선택곡 → 특정 플리)
  const addSelectedToPlaylist = (playlistId: string) => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(playlistId);
    if (!curr) return;

    const incoming = selectedTracks.map((t) => ({
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
    setSelected(new Set());
  };

  // ✅ 공유(선택곡 링크/정보 복사)
  const shareSelected = async () => {
    if (selectedCount === 0) return;

    const text = selectedRows
      .map((r) => `- ${r.title} (${r.duration})`)
      .join("\n");

    // Web Share API 우선
    try {
      if (navigator.share) {

        await navigator.share({
          title: "AI 곡 공유",
          text,
        });
        return;
      }
    } catch {
      // 사용자가 취소해도 여기로 올 수 있음 → 무시
    }

    // fallback: 클립보드 복사
    try {
      await navigator.clipboard.writeText(text);
      alert("선택한 곡 목록을 클립보드에 복사했어요!");
    } catch {
      alert("공유에 실패했어요. (클립보드 권한 확인)");
    }
  };

  type ActionKey = "play" | "shuffle" | "add" | "share";

  const handleAction = (key: ActionKey) => {
    if (selectedCount === 0 && (key === "play" || key === "shuffle" || key === "add" || key === "share")) return;

    if (key === "play") playTracks(selectedTracks);
    if (key === "shuffle") playTracks(selectedTracks, { shuffle: true });
    if (key === "add") setAddOpen(true);
    if (key === "share") shareSelected();
  };

  const goToAlSongPage = (trackId: string) => {
    navigate(`/aisong/${trackId}`); 
    // 예) navigate(`/alsongpage/${trackId}`);
    // 예) navigate(`/ai/song/${trackId}`);
  };



  
  return (
    <div className="w-full h-full overflow-x-auto" >
      <div className="grid min-h-screen items-stretch grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.05fr)] gap-6">
        {/* ===================== 좌측: 생성 폼 ===================== */}
        <section>
          {/* 상단: 뒤로가기 + 타이틀 */}
          <div className="flex pt-2 place-items-start">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
              className="p-2 text-[#f6f6f6] rounded-full hover:bg-white/10 transition">
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
                className="w-72 h-72 rounded-2xl shadow-md bg-[#3d3d3d]/90 border border-[#3d3d3d] hover:bg-[#3d3d3d]/40 transition flex flex-col items-center justify-center"
                aria-label="add cover"
                >
                {coverUrl ? (
                    // ✅ 이미지가 선택되어 있으면 미리보기 표시
                    <img
                        src={coverUrl}
                        alt="cover preview"
                        className="h-full w-full object-cover"
                    />
                    ) : (
                    // ✅ 아직 이미지가 없으면 기존 UI(플러스 아이콘 + 안내문구)
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

             {/* ✅ 실제 업로드를 담당하는 파일 input (숨김) */}
              <input
                  ref={fileRef}            // ✅ 버튼에서 클릭할 대상
                  type="file"
                  accept="image/*"         // ✅ 이미지 파일만 선택 가능하게
                  onChange={onCoverChange} // ✅ 파일 선택 시 상태 업데이트
                  className="hidden"/>
                
             {/* 프롬프트 카드 */}
              <div className="mt-10 mx-4 rounded-2xl bg-[#3d3d3d]/80 backdrop-blur-xl border border-[#3d3d3d] shadow-md p-5">
                <div className="p-2 text-sm font-semibold text-[#f6f6f6]">
                  AI 노래 프롬프트
                </div>

                <div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, maxPrompt))}
                    placeholder="예) 새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬..."
                    className="placeholder-[#777777] mt-2 p-2 w-full resize-none bg-transparent text-sm text-[#f6f6f6] outline-none min-h-[180px]"/>
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
                disabled:active:scale-100">
              <div className="flex gap-2 items-center">
                <MdMusicNote size={18} />AI 노래 생성하기
              </div>
            </button>
          </div>
        </section>



        {/* ===================== 우측: 리스트/테이블 ===================== */}
        <section className="-mb-24 rounded-2xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden text-[#f6f6f6]">
          {/* ✅ 상단 헤더(검색바 + 액션) : 참고 코드 스타일 */}
          <div className="px-8 py-6 border-b border-[#464646]">
            {/* 검색바 */}
            <div className="flex items-center gap-3 rounded-full bg-[#3d3d3d] px-4 py-2 text-[#666666]">
              <MdSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="AI 곡 검색하기"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#666666]"
              />
            </div>

            {/* 액션 버튼들 */}
            <div className="mt-4 flex flex-nowrap gap-3 text-[#f6f6f6]">
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

          </div>

          {/* ✅ 테이블 영역(폭/그리드 그대로 유지) */}
          <div className="mt-0">
            {/* 헤더 */}
            <div className="grid items-center grid-cols-[40px_minmax(0,1fr)_84px_140px] px-4 py-3 text-[12px] text-white/55">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={toggleAllVisible}
                aria-label="select all"
                className="ml-2 accent-[#f6f6f6]"
              />

              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">곡정보</div>
              <div className="pl-2 border-l border-[#E6E6E6]/20 text-[#f6f6f6]">길이</div>

              {/* ✅ 생성일시 유지 + 기존 ml-12 제거(폭 건드리는 게 아니라 정렬만 자연스럽게) */}
              <div className="pr-2 border-r border-[#E6E6E6]/20 text-[#f6f6f6] text-right">
                생성 일시
              </div>
            </div>

            <div className="border-b border-[#464646]" />

            {/* 바디 */}
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

                        {/* 곡 길이 */}
                        <div className="pl-2 border-l border-[#E6E6E6]/20 text-left text-xs text-[#f6f6f6]">
                          {r.duration}
                        </div>

                        {/* 생성 일시 */}
                        <div className="pr-2 border-r border-[#E6E6E6]/20 text-right text-xs text-[#f6f6f6]">
                          {r.createdAt}
                        </div>
                </div>
              ))}
            </div>
          </div>

          {/* 결과 없음 */}
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



      </div>
    </div>
  );
}
