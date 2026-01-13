import { NavLink, Outlet, useSearchParams, useMatch } from "react-router-dom";

import { IoPlayCircle } from "react-icons/io5";
import { IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd } from "react-icons/md";
import { MdFavorite } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";



const actions = [
  { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
  { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
  { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
  { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
];

function Tab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  const [sp] = useSearchParams();

  const searchStr = sp.toString();
  const search = searchStr ? `?${searchStr}` : "";

  return (
    <NavLink
      to={{ pathname: to, search }}
      end={end}
      className={({ isActive }) =>
        [
          // ✅ ChartTop100의 버튼 감성에 맞춰 text-sm/padding 통일
          "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
          isActive
            ? "bg-[#6B6B6B] text-white"
            : "bg-[#E9E9E9] text-[#666666] hover:bg-[#DDDDDD]",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}


/** ✅ ChartTop100 액션 버튼 규격 그대로 */
function ActionPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="
        shrink-0 px-4 py-2
        rounded-2xl
        outline outline-1 outline-offset-[-1px] outline-stone-500
        text-sm text-[#666666] hover:bg-[#f6f6f6]
        transition
        flex items-center gap-2
      "
      aria-label={label}
    >
      <span className="text-lg text-[#666666]">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}



export default function SearchPage() {
  const isSongTab = !!useMatch("/search/song");

  // ✅ AI 제외 필터 상태를 URL 쿼리로 저장
  const [sp, setSp] = useSearchParams();
  const noAi = sp.get("noai") === "1"; // noai=1이면 AI 결과 제외

  const toggleNoAi = () => {
    const next = new URLSearchParams(sp);
    if (noAi) next.delete("noai");
    else next.set("noai", "1");
    setSp(next, { replace: true }); // 토글 클릭이 뒤로가기 히스토리에 쌓이는 걸 방지
  };

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      {/* ✅ 탭 + (곡탭일 때) 액션버튼 = sticky 영역 안에 같이 넣기 */}
      <div className="sticky top-0 z-20 bg-white pt-2">

        <div className="mt-2 flex items-center gap-3">
        {/* 탭 */}
        <div className="flex items-center gap-3">
          <Tab to="." label="모두" end />
          <Tab to="artist" label="아티스트" />
          <Tab to="song" label="곡" />
          <Tab to="album" label="앨범" />
        </div>


          {/* ✅ AI 필터 토글(스크린샷 느낌: 체크 아이콘 + 텍스트) */}
              <button
                type="button"
                onClick={toggleNoAi}
                className={[
                  "shrink-0 inline-flex items-center gap-2",
                  "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
                  noAi ? "bg-[#6B6B6B] text-white" : "bg-[#E9E9E9] text-[#666666] hover:bg-[#DDDDDD]",
                ].join(" ")}
                aria-pressed={noAi}
              >
                <FaCheckCircle size={18}/>
                 AI 필터
              </button >
            </div>



          {/* optional: 아래 구분선으로 탭과 컴포넌트 닿지 않게 */}
         <div className="mt-4" />  


        {/* ✅ 곡 탭에서만 액션 버튼 표시 (ChartTop100 스타일) */}
        {isSongTab && (
          <>
          <div className="mt-4 flex flex-nowrap gap-3">
            {actions.map((a) => (
              <ActionPill key={a.key} icon={a.icon} label={a.label} />
            ))}
          </div>
          {/* ✅ 버튼 아래 고정 여백(투명 구분선) */}
          <div className="h-4 border-b border-transparent" />
          </>
          
        )}

      </div>

      {/* Outlet */}
      <div className="flex-1 min-h-0 overflow-y-auto py-6">
        {isSongTab && (
    <div className="mt-2" />
  )}

        <Outlet />
      </div>
    </div>
  );
}
