import { Outlet } from "react-router-dom";
import Spline from "@splinetool/react-spline";

export default function AuthLayout() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#2d2d2d]">
      {/* ✅ Spline 배경 */}
      <div className="absolute inset-0 pointer-events-none">
        <Spline
          scene="https://prod.spline.design/8UmKhFdsJ-bH6xn1/scene.splinecode"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* ✅ 가독성용 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />

      {/* ✅ 페이지 콘텐츠 */}
      <div className="relative z-10 min-h-[100dvh] w-full">
        <Outlet />
      </div>
    </div>
  );
}
