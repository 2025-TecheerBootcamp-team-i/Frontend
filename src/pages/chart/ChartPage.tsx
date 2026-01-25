    import { NavLink, Outlet } from "react-router-dom";

    function Tab({ to, label }: { to: string; label: string }) {
        return (
            <NavLink
            to={to}
            className={({ isActive }) =>
                [
                "px-4 py-2 rounded-full text-base transition whitespace-nowrap",
                isActive
                    ? "bg-[#E4524D]/80 text-[#f6f6f6] font-semibold scale-105 z-10"
                    : "bg-white/20 text-[#F6F6F6] hover:bg-white/[0.08] font-semibold hover:scale-105",
                ].join(" ")
            }
            >
            {label}
            </NavLink>
        );
    }

    export default function ChartPage() {
        return (
            <div className="w-full min-w-0 h-full flex flex-col">
            
            {/* ✅ 상단(탭) 고정 */}
            <div className="sticky top-0 z-20 pt-2">
                <div className="mt-2 px-4 flex gap-3">
                <Tab to="top100" label="TOP 100" />
                <Tab to="daily" label="일일 차트" />
                <Tab to="ai" label="AI 음악" />
                </div>

                {/* optional: 아래 구분선 */}
                <div className="mt-4 border-b border-white/10" />
            </div>

            {/* ✅ 아래(Outlet)만 스크롤 */}
            <div className="flex-1 min-h-0 overflow-y-auto py-6">
                <Outlet />
            </div>
            </div>
        );
    }
