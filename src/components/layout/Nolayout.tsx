import { Outlet } from "react-router-dom";
import StarBackground from "../common/StarBackground";

/**
 * ✅ AuthLayout (Login/Signup/Onboarding)
 * - 기존 Spline 배경을 제거하고 가벼운 Pixel Star 배경으로 변경
 */

export default function AuthLayout() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* ✅ 별 배경 컴포넌트 */}
      <StarBackground />

      {/* ✅ 가독성 오버레이 (필요시 조정 가능, 현재는 배경 자체가 어두워서 약하게 처리) */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* ✅ 페이지 콘텐츠 */}
      <div className="relative z-10 min-h-[100dvh] w-full">
        <Outlet />
      </div>
    </div>
  );
}
