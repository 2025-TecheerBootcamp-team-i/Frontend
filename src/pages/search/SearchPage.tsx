import { NavLink, Outlet, useSearchParams, useMatch, useResolvedPath } from "react-router-dom";
import { type ReactNode } from "react";

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
      to={`${to}${search}`}
      end={end}
      className={({ isActive }) =>
        [
          // ✅ ChartTop100의 버튼 감성에 맞춰 text-sm/padding 통일
          "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
          isActive
            ? "bg-[#E4524D] text-[#f6f6f6]"
            : "bg-[#777777] text-[#f6f6f6] hover:bg-[#5d5d5d]",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}


/** ✅ 재생, 담기, 셔플, 좋아요, 그리고 AI 제외 기능 */
function ActionPill({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={!!active}
      className={[
        "shrink-0 px-4 py-2 rounded-2xl text-sm transition flex items-center gap-2",
        "outline outline-1 outline-offset-[-1px]",
        active
          ? "bg-[#f6f6f6] text-[#4e4e4e]"
          : "outline-[#f6f6f6] text-[#f6f6f6] hover:bg-[#4e4e4e]",
      ].join(" ")}
    >
      {/* ✅ active일 때만 체크가 '진하게' 보이도록 */}
          <span className="text-lg">{icon}</span>
          <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}



export default function SearchPage() {
  const songPath = useResolvedPath("song");     // 현재 라우트(/search) 기준으로 "/search/song" 만들어줌
  const isSongTab = !!useMatch({ path: songPath.pathname, end: false });
  const [sp, setSp] = useSearchParams();
  const excludeAi = sp.get("noai") === "1";
  
    return (
    <div className="p-4 w-full min-w-0 h-full flex flex-col">
      {/* ✅ 탭 + (곡탭일 때) 액션버튼 = sticky 영역 안에 같이 넣기 */}
      <div className="sticky top-0 z-20 pt-2">

        <div className="flex items-center gap-3">
        {/* 탭 */}
        <div className="flex items-center gap-3">
          <Tab to="." label="모두" end />
          <Tab to="song" label="곡" />
          <Tab to="artist" label="아티스트" />
          <Tab to="album" label="앨범" />
        </div>
    </div>



          {/* optional: 아래 구분선으로 탭과 컴포넌트 닿지 않게 */}
         <div className="mt-4" />  


        {/* ✅ 곡 탭에서만 액션 버튼 표시 (ChartTop100 스타일) */}
        {isSongTab && (
          <>
        <div className="mt-4 flex flex-nowrap gap-3">
        {/* ✅ 재생 왼쪽: AI 제외 토글 나중에 Gemini icon으로 변경 필요 */}
        <ActionPill
          icon={<FaCheckCircle size={18} />}
          label={excludeAi ? "AI 제외 필터" : "AI 제외 필터"}
          active={excludeAi}
          onClick={() => {
            const next = new URLSearchParams(sp); // 기존 q 같은 파라미터 보존
            if (excludeAi) next.delete("noai");
            else next.set("noai", "1");
            setSp(next, { replace: true }); // 히스토리 스택 쌓기 싫으면 replace:true 추천
          }}
          />

  {/* 기존 액션 버튼들 */}
  {actions.map((a) => (
    <ActionPill key={a.key} icon={a.icon} label={a.label} />
  ))}
</div>
        </>
          
        )}

      </div>

      {/* Outlet */}
      <div className="flex-1 min-h-full py-6">
        {isSongTab && (
    <div className="mt-2" />
  )}

        <Outlet context={{ excludeAi }} />
      </div>
    </div>
  );
}
