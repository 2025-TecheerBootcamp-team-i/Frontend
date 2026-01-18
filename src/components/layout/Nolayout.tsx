import { Outlet } from "react-router-dom";

export default function AuthLayout() {

  return (
    <div className="relative h-screen">
    {/* ✅ 움직이는 그라데이션 배경 레이어 */}
    <div
        className="
        pointer-events-none absolute inset-0
        bg-[linear-gradient(180deg,#2D2D2D_30%,#5D5D5D_100%)]
        bg-[length:200%_200%]
        animate-bgGradient
        "
    />

      <div>
        <Outlet />
      </div>
    </div>
  );
}