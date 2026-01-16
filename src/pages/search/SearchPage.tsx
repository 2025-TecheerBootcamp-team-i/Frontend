import { NavLink, Outlet, useSearchParams } from "react-router-dom";

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
          "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
          isActive
            ? "bg-[#E4524D] text-[#f6f6f6]"
            : "bg-[#4d4d4d] text-[#f6f6f6] hover:bg-[#5d5d5d]",
        ].join(" ")
      }
    > 
      {label}
    </NavLink>
  );
}

export default function SearchPage() {
  const [sp] = useSearchParams();
  const excludeAi = sp.get("noai") === "1";

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="sticky top-0 z-20 pt-2">
        <div className="mt-2 px-4 flex gap-3 items-center">
          <Tab to="." label="모두" end />
          <Tab to="song" label="곡" />
          <Tab to="artist" label="아티스트" />
          <Tab to="album" label="앨범" />
        </div>

        <div className="mt-4 border-b border-[#464646]" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-0">
        <div className="px-0">
          <Outlet context={{ excludeAi }} />
        </div>
      </div>
    </div>
  );
}
