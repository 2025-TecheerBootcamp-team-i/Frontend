import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  MdArrowBackIosNew,
  MdSearch,
  MdPlaylistAdd,
  MdShare,
  MdMusicNote,
  MdAdd
} from "react-icons/md";

import { IoShuffle } from "react-icons/io5";



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
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#3d3d3d] px-4 py-2 text-sm text-white/90 hover:bg-black/30 transition"
    >
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
  const goToAlSongPage = (trackId: string) => {
    navigate(`/aisong/${trackId}`); 
    // 예) navigate(`/alsongpage/${trackId}`);
    // 예) navigate(`/ai/song/${trackId}`);
  };



  
  return (
    <div className="p-6" >
      <div className="grid min-h-screen items-stretch grid-cols-1 lg:grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.05fr)] gap-6">
        {/* ===================== 좌측: 생성 폼 ===================== */}
        <section>
          {/* 상단: 뒤로가기 + 타이틀 */}
          <div className="flex place-items-start">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="back"
              className="text-[#f6f6f6] hover:text-[#888] transition">
              <MdArrowBackIosNew size={24} />
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
            <div className="mt-16 flex flex-col items-center">
              <button
                type="button"
                onClick={onPickCover}
                className="w-72 h-72 rounded-2xl shadow-md bg-[#353535] hover:bg-white/10 transition flex flex-col items-center justify-center"
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
                  <p className="mt-3 text-[11px] text-center text-[#a3a3a3] leading-relaxed">
                    *커버 사진을 추가하지 않아도 AI가 자동으로 생성해드립니다.
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
              <div className="mt-10 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/5 shadow-md p-5">
                {/* 기존 디자인 - mt-10 rounded-3xl bg-[#353535] p-5 */}
                <div className="p-2 text-sm font-semibold text-[#f6f6f6]">
                  AI 노래 프롬프트
                </div>

                <div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, maxPrompt))}
                    placeholder="예) 새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬..."
                    className="mt-4 p-2 w-full resize-none bg-transparent text-sm text-[#f6f6f6] outline-none min-h-[180px]"/>
                  <div className="mt-2 text-right text-[11px] text-[#f6f6f6]/60">
                    {prompt.length}/{maxPrompt}
                  </div>
                </div>
              </div>

          {/* 생성 버튼 */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              className="w-96 rounded-full bg-[#f6f6f6]/10 backdrop-blur-xl border border-white/5 shadow-md hover:bg-white/10 transition py-4 flex items-center justify-center gap-1">
                {/* 기존 디자인 - bg-[#353535] hover:bg-white/10 transition */}
              <div className="text-[#f6f6f6]">
                <MdMusicNote />
              </div>
              <span className="text-sm font-semibold text-[#f6f6f6]">AI 노래 생성하기</span>
            </button>
          </div>
        </section>



        {/* ===================== 우측: 리스트/테이블 ===================== */}
        <section className="-mb-24 bg-[#2d2d2d] p-10 text-white lg:-mt-10 lg:-mr-10">
          {/* 검색바 */}
          <div className="flex items-center gap-3 rounded-full bg-[#3d3d3d] px-4 py-2 text-[#666666]">
            <MdSearch/>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="나의 AI 곡 검색하기"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#666666]"
            />
          </div>

          {/* 액션 버튼들 */}
          <div className="mt-4 flex flex-wrap gap-2 text-[#f6f6f6]">
            <PillButton icon={<MdPlaylistAdd />} label="담기" />
            <PillButton icon={<IoShuffle />} label="셔플" />
            <PillButton icon={<MdShare />} label="공유" />
          </div>

          {/* 테이블 영역 */}
          <div className="mt-4 rounded-2xl overflow-hidden bg-[#2d2d2d]">
            {/* 헤더 */}
            <div className="grid items-center grid-cols-[40px_84px_minmax(0,1fr)_140px] px-4 py-3 text-[12px] text-white/55 border-b border-white/10">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={toggleAllVisible}
                aria-label="select all"
                className="h-4 w-4 accent-[#f6f6f6]"
              />

              
              <div className="pl-2 border-l text-[#f6f6f6] border-[#f6f6f6]">업로드</div>
              <div className="pl-2 border-l text-[#f6f6f6] border-[#f6f6f6]">곡정보</div>
              <div className="ml-12 pl-2 border-l text-[#f6f6f6] border-[#f6f6f6]">생성 일시</div>
            </div>

            {/* 바디 */}
            <div className="divide-y divide-white/10">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="grid items-center grid-cols-[40px_84px_minmax(0,1fr)_140px] px-4 py-3 hover:bg-white/5 transition"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`select ${r.title}`}
                    className="h-4 w-4 accent-[#f6f6f6]"
                  />

                  {/* 상태 */}
                  <div
                    className={[
                      "text-xs",
                      r.status === "Upload" ? "text-[#E45A4D]" : "text-[#aeaeae]",
                    ].join(" ")}
                  >
                    {r.status}
                  </div>

                  {/* 곡정보 */}
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-xl bg-white/20 shrink-0">
                        <div className="absolute bottom-1 right-1 text-[8px] text-white/80"
                          style={{ textShadow: "0 4px 4px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1)" }}>
                          {r.duration}
                        </div>
                    </div>
                    <div className="relative group w-full">
                        <button
                          type="button"
                          onClick={() => goToAlSongPage(r.id)}
                          className="block w-full truncate text-left text-[12px] text-[#f6f6f6] cursor-pointer hover:underline underline-offset-2"
                          aria-label={'${r.title} 상세로 이동'}>
                          {r.title}
                        </button>
                        {/* 포인터 추가했지만 필요없으면 제거 */}
                          <div
                            className="
                              pointer-events-none
                              absolute bottom-full -mb-14 -ml-4
                              hidden group-hover:block
                              whitespace-nowrap
                              rounded-md bg-[#3a3a3a] px-2 py-1
                              text-[10px] text-[f6f6f6] shadow-xl">
                            곡 페이지 열기
                          </div>
                        <div className="truncate text-left text-[12px] text-[#f6f6f6]">
                          {r.desc}
                        </div>
                    </div>
                  </div>


                  {/* 생성일시 */}
                  <div className="text-right text-xs text-[#f6f6f6]">
                    {r.createdAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 결과 없음 */}
          {filtered.length === 0 && (
            <div className="mt-6 text-center text-sm text-[#f6f6f6]">
              {query}에 대한 검색 결과가 없습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
