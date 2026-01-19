import { Outlet } from "react-router-dom";

export default function AuthLayout() {

  return (
    <div className="relative h-screen">
    {/* ✅ 움직이는 그라데이션 배경 레이어 */}
    <div
        className="
        pointer-events-none absolute inset-0
        "
    />

      <div>
        <Outlet />
      </div>
    </div>
  );
}