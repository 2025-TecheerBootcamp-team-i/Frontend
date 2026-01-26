// ✅ LoginPage.tsx (성능 개선 버전)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdOutlineMail,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import { login } from "../../api/auth";

// ✅ CHANGED: useEffect로 style 주입하지 않고, 모듈 스코프에서 1번만 주입
let __verticalFloatStyleInjected = false;
function ensureVerticalFloatStyle() {
  if (__verticalFloatStyleInjected) return;
  __verticalFloatStyleInjected = true;

  const style = document.createElement("style");
  style.setAttribute("data-login-vertical-float", "true");
  style.innerHTML = `
    @keyframes verticalFloat {
      0%   { transform: translate3d(0,0,0); }
      50%  { transform: translate3d(0,-10px,0); }
      100% { transform: translate3d(0,0,0); }
    }
    .animate-verticalFloat {
      display: inline-block;
      animation: verticalFloat 7s ease-in-out infinite;
      transform: translate3d(0,0,0);
      will-change: transform;
    }
  `;
  document.head.appendChild(style);
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ CHANGED: 마운트 시 1회 보장(언마운트 때 제거 안 함 = 다시 들어와도 재삽입 X)
  useEffect(() => {
    ensureVerticalFloatStyle();
  }, []);

  const canLogin = id.trim().length > 0 && pw.trim().length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogin || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await login({
        email: id.trim(),
        password: pw,
      });

      // 토큰 저장 (localStorage 사용)
      localStorage.setItem("access_token", response.access);
      localStorage.setItem("refresh_token", response.refresh);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: response.user_id,
          email: response.email,
          nickname: response.nickname,
        })
      );

      // ✅ 로그인 이벤트 발생 (PlaylistContext가 플레이리스트를 로드하도록)
      window.dispatchEvent(new Event("login"));

      alert(`환영합니다, ${response.nickname}님!`);
      navigate("/home");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "로그인에 실패했습니다.";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // ✅ 배경은 AuthLayout이 처리 → 여기선 카드만
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-6">
      {/* ✅ CHANGED: huge shadow 줄임 + 배경 불투명 쪽으로 (backdrop-blur 없음 유지) */}
      <div className="relative w-full max-w-[920px] rounded-3xl bg-[#1b1b22]/70 border border-[#2d2d2d] shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* ✅ 중앙 경계 그라데이션 (md 이상에서만) */}
        <div
          className="
            pointer-events-none
            absolute
            top-0
            left-1/2
            hidden
            md:block
            -translate-x-1/2
            h-full
            w-[2px]
            bg-gradient-to-b
            from-transparent
            via-white/40
            to-transparent
          "
        />

        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[560px]">
          {/* LEFT */}
          <div className="relative h-full p-8 md:p-10 flex flex-col justify-between">
            {/* ✅ CHANGED: content-visibility로 페인트 최적화 + blur 원 크기 줄임 */}
            <div
              className="absolute inset-0"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={{ contentVisibility: "auto" as any }} // ✅ CHANGED
            >
              <div className="h-full w-full bg-gradient-to-br from-[#5fd8e4] via-[#9fd6db] to-[#eef6f6]" />
              <div className="absolute inset-0 bg-black/15" />
              {/* ✅ CHANGED: blur 유지하되 원 크기 줄여서 부담 감소 */}
              <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/20 blur-xl" />
              <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-black/20 blur-xl" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="font-bold tracking-wide text-xl text-[#2d2d2d]">
                서비스명
              </div>
              <button
                type="button"
                className="
                  text-[#2d2d2d]
                  text-sm
                  px-3 py-2
                  rounded-full
                  bg-white/20
                  hover:bg-white/50
                  transition
                "
                onClick={() => navigate("/home")}
              >
                바로 서비스 이용하기 →
              </button>
            </div>

            <div className="relative z-10 mt-10 animate-verticalFloat">
              <p className="text-[#2d2d2d] text-3xl md:text-4xl font-semibold leading-tight">
                Listen & Create
                <br />
                Stay in the Flow
              </p>
              <p className="mt-4 text-[#2d2d2d]/70 text-sm md:text-base max-w-[360px]">
                완성도 높은 스트리밍을 기반으로
                <br />
                음악을 보고, 이해하고, 직접 만들어보세요 🎶
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="h-full p-8 md:p-10 bg-[#3d3d3d]/30 flex items-center justify-center">
            <form
              onSubmit={onSubmit}
              className="w-[320px] flex flex-col items-center"
            >
              {/* 헤더 */}
              <div className="w-full text-center mb-6">
                <div className="text-[#f6f6f6] font-semibold">Login</div>
              </div>

              {/* ID */}
              <div className="relative w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
                  <MdOutlineMail size={18} />
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Email ID"
                  className="
                    w-full h-11
                    rounded-md
                    bg-[#3d3d3d]/80
                    pl-11 pr-4
                    text-sm text-[#f6f6f6]
                    placeholder:text-[#f6f6f6]/40
                    outline-none
                    focus:ring-2 focus:ring-white/30
                  "
                />
              </div>

              {/* PW */}
              <div className="relative w-full mt-3">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
                  <MdLockOutline size={18} />
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Password"
                  className="
                    w-full h-11
                    rounded-md
                    bg-[#3d3d3d]/80
                    pl-11 pr-11
                    text-sm text-[#f6f6f6]
                    placeholder:text-[#f6f6f6]/40
                    outline-none
                    focus:ring-2 focus:ring-white/30
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition"
                  aria-label={showPw ? "비밀번호 보기" : "비밀번호 숨기기"}
                >
                  {showPw ? (
                    <MdVisibility size={18} />
                  ) : (
                    <MdVisibilityOff size={18} />
                  )}
                </button>
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={!canLogin || isSubmitting}
                className={[
                  "mt-10 w-full h-11 rounded-full text-sm transition",
                  canLogin && !isSubmitting
                    ? "bg-[#e45a4d] text-[#f6f6f6] hover:brightness-110"
                    : "bg-[#e45a4d]/40 text-white/50 cursor-not-allowed",
                ].join(" ")}
              >
                {isSubmitting ? "처리 중..." : "Login"}
              </button>

              <div className="w-full mt-4 flex">
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <span className="mt-4 text-[10px] text-white/60">
                계정이 없으신가요?
              </span>

              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="
                  mt-3
                  w-full h-11
                  rounded-full
                  bg-[#3d3d3d]
                  text-sm text-[#f6f6f6]
                  hover:bg-[#4d4d4d]/30
                  transition
                "
              >
                Sign up
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
