// src/components/layout/AuthLayout.tsx
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";

/**
 * ✅ AuthLayout (Login/Signup/Onboarding)
 * - Spline 배경은 "있으면 좋고, 없으면 말고"로 설계
 * - Spline 로딩/네트워크/런타임 에러가 나도 Outlet(로그인 UI)은 절대 죽지 않게 방어
 * - DEV에서는 기본적으로 Spline을 꺼두고(원하면 켤 수 있음), PROD에서만 켜는 방식 추천
 */

const Spline = React.lazy(() => import("@splinetool/react-spline"));

type WindowWithIdle = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function SafeSpline({
  scene,
  className,
  style,
}: {
  scene: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  // Spline 컴포넌트가 로딩/렌더링 중 throw 하거나,
  // Spline 내부 fetch/파싱에서 문제가 나면 배경만 꺼버리고 로그인 UI는 유지.
  if (failed) return null;

  return (
    <Suspense fallback={null}>
      <Spline
        scene={scene}
        className={className}
        style={style}
        // @splinetool/react-spline에서 onError 지원하는 버전이 많음
        // 타입이 빡빡하면 TS에서 불평할 수 있으니 안전하게 캐스팅
        {...({
          onError: () => setFailed(true),
        } as unknown as Record<string, unknown>)}
      />
    </Suspense>
  );
}

export default function AuthLayout() {
  // ✅ DEV에서는 기본 OFF (지금 너처럼 dev환경이 불안정할 때 로그인부터 살리는 게 우선)
  // 필요하면 .env.local에 VITE_ENABLE_SPLINE_AUTH=true 로 켤 수 있게.
  const enableSpline = useMemo(() => {
    const flag = String(import.meta.env.VITE_ENABLE_SPLINE_AUTH || "").toLowerCase();
    // true/1/on/yes 를 켬으로 처리
    const wantsOn = ["true", "1", "on", "yes"].includes(flag);
    // prod는 기본 ON, dev는 기본 OFF (원하면 env로 ON)
    return import.meta.env.PROD ? true : wantsOn;
  }, []);

  // ✅ 첫 프레임/입력 준비 후에만 배경 렌더 (UI 우선)
  const [showSpline, setShowSpline] = useState(false);

  useEffect(() => {
    if (!enableSpline) return;

    const w = window as WindowWithIdle;

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShowSpline(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }

    const t = window.setTimeout(() => setShowSpline(true), 200);
    return () => window.clearTimeout(t);
  }, [enableSpline]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#2d2d2d]">
      {/* ✅ Spline 배경 (실패해도 로그인 UI는 절대 안 죽게) */}
      <div className="absolute inset-0 pointer-events-none">
        {enableSpline && showSpline ? (
          <SafeSpline
            scene="https://prod.spline.design/8UmKhFdsJ-bH6xn1/scene.splinecode"
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
      </div>

      {/* ✅ 가독성 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />

      {/* ✅ 페이지 콘텐츠 */}
      <div className="relative z-10 min-h-[100dvh] w-full">
        <Outlet />
      </div>
    </div>
  );
}
