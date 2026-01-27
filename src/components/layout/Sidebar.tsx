// src/components/layout/Sidebar.tsx

const PLAYER_H = 85; // ✅ 플레이어 높이(px)

function Sidebar() {

  return (
    <aside
      className="
        w-[360px]
        flex-none shrink-0
        bg-transparent
        backdrop-blur-xl
        border-r border-white/5
        flex flex-col
        sticky top-0
        z-40
        overflow-y-auto
        overscroll-contain
        no-scrollbar
      "
      style={{
        height: `calc(100vh - ${PLAYER_H}px)`,
      }}
    >
      <div className="flex flex-col gap-4 px-4 pt-4 pb-12">
        {/* 마이페이지 섹션 제거됨 */}
      </div>
    </aside>
  );
}

export default Sidebar;
