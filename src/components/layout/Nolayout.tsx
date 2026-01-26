import React, { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

const Spline = React.lazy(() => import("@splinetool/react-spline"));

export default function AuthLayout() {
  // ✅ [CHANGED] 첫 프레임/입력 준비 후에만 배경 렌더
  const [showSpline, setShowSpline] = useState(false);

  useEffect(() => {
    // ✅ [CHANGED] 브라우저가 한가할 때(가능하면) 켠다
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShowSpline(true), { timeout: 1500 });
      return () => {
        // cancelIdleCallback은 타입이 없을 수 있어 안전하게만 처리
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).cancelIdleCallback?.(id);
      };
    }

    // fallback: 다음 tick에 켠다(티 거의 안 남)
    const t = window.setTimeout(() => setShowSpline(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#2d2d2d]">
      {/* ✅ Spline 배경 (idle 후 mount) */}
      <div className="absolute inset-0 pointer-events-none">
        {showSpline ? (
          <Suspense fallback={null}>
            <Spline
              scene="https://prod.spline.design/8UmKhFdsJ-bH6xn1/scene.splinecode"
              style={{ width: "100%", height: "100%" }}
            />
          </Suspense>
        ) : null}
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
