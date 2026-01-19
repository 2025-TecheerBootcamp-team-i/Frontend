import { NavLink, Outlet, useSearchParams } from "react-router-dom";


function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
          isActive
            ? "bg-[#E4524D] text-[#F6F6F6]"
            : "bg-[#4d4d4d] text-[#F6F6F6] hover:bg-[#5d5d5d]",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function SearchPage() {
  const [sp] = useSearchParams();

  // ✅ 현재 쿼리 전체 유지 (q, noai 등 전부)
  const searchStr = sp.toString();
  const search = searchStr ? `?${searchStr}` : "";

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="sticky top-0 z-20 pt-2">
        <div className="mt-2 px-4 flex gap-3 items-center">
          {/* ✅ MyPlaylistPage처럼: 루트는 "" + end */}
          <Tab to={`all${search}`} label="모두" />
          <Tab to={`song${search}`} label="곡" />
          <Tab to={`artist${search}`} label="아티스트" />
          <Tab to={`album${search}`} label="앨범" />
        </div>

        <div className="mt-4 border-b border-[#464646]" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-0">
        <div className="px-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
