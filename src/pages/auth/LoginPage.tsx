import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdOutlineMail,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";

export default function LoginPage() {
  const navigate = useNavigate();

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  // ✅ LEFT 문구 자동 슬라이드(한 번 살짝 이동해서 돌아오는 느낌)
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes leftSlide {
        0%   { transform: translateX(0); }
        45%  { transform: translateX(0); }
        70%  { transform: translateX(-14px); }
        100% { transform: translateX(0); }
      }
      .animate-leftSlide { animation: leftSlide 6.5s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const canLogin = id.trim().length > 0 && pw.trim().length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogin) return;
    navigate("/home");
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* ✅ 베이스 배경 (한 번만!) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1720] via-[#2a4b55] to-[#101018]" />
      {/* ✅ 추가: 라디얼 그라데이션(무드 확실하게) */}
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_15%,rgba(111,231,241,0.22),transparent_60%),radial-gradient(60%_55%_at_80%_25%,rgba(175,222,226,0.16),transparent_55%)]" />

      {/* ✅ 움직이는 글로우 + 웨이브(2겹) */}
      <div className="pointer-events-none absolute inset-0">
        {/* 글로우 */}
        <div className="absolute -top-48 -left-48 h-[560px] w-[560px] rounded-full bg-[#afdee2]/32 blur-3xl animate-blob1" />
        <div className="absolute -bottom-48 -right-44 h-[620px] w-[620px] rounded-full bg-[#afdee2]/24 blur-3xl animate-blob2" />
        <div className="absolute top-1/3 -right-56 h-[420px] w-[420px] rounded-full bg-[#afdee2]/18 blur-3xl animate-blob3" />

        {/* ✅ 웨이브 1 */}
        <svg
          className="absolute -bottom-28 left-0 w-[150%] opacity-55"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveBack)"
            d="M0,192L60,186.7C120,181,240,171,360,170.7C480,171,600,181,720,192C840,203,960,213,1080,208C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z"
          >
            <animate
              attributeName="d"
              dur="14s"
              repeatCount="indefinite"
              values="
                M0,192L60,186.7C120,181,240,171,360,170.7C480,171,600,181,720,192C840,203,960,213,1080,208C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z;
                M0,176L60,165.3C120,155,240,133,360,138.7C480,144,600,176,720,192C840,208,960,208,1080,192C1200,176,1320,144,1380,128L1440,112L1440,320L0,320Z;
                M0,208L60,213.3C120,219,240,229,360,224C480,219,600,197,720,186.7C840,176,960,176,1080,186.7C1200,197,1320,219,1380,229.3L1440,240L1440,320L0,320Z;
                M0,192L60,186.7C120,181,240,171,360,170.7C480,171,600,181,720,192C840,203,960,213,1080,208C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z
              "
            />
          </path>
          <defs>
            <linearGradient id="waveBack" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(175,222,226,0.22)" />
              <stop offset="55%" stopColor="rgba(111,231,241,0.18)" />
              <stop offset="100%" stopColor="rgba(175,222,226,0.14)" />
            </linearGradient>
          </defs>
        </svg>

        {/* ✅ 웨이브 2 */}
        <svg
          className="absolute -bottom-14 left-0 w-[140%] opacity-75"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveFront)"
            d="M0,224L60,213.3C120,203,240,181,360,176C480,171,600,181,720,192C840,203,960,213,1080,208C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z"
          >
            <animate
              attributeName="d"
              dur="9s"
              repeatCount="indefinite"
              values="
                M0,224L60,213.3C120,203,240,181,360,176C480,171,600,181,720,192C840,203,960,213,1080,208C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z;
                M0,208L60,197.3C120,187,240,165,360,160C480,155,600,165,720,181.3C840,197,960,219,1080,224C1200,229,1320,219,1380,213.3L1440,208L1440,320L0,320Z;
                M0,240L60,234.7C120,229,240,219,360,208C480,197,600,187,720,192C840,197,960,219,1080,224C1200,229,1320,219,1380,208L1440,197.3L1440,320L0,320Z;
                M0,224L60,213.3C120,203,240,181,360,176C480,171,600,181,720,192C840,203,960,213,1080,208C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z
              "
            />
          </path>
          <defs>
            <linearGradient id="waveFront" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(111,231,241,0.30)" />
              <stop offset="50%" stopColor="rgba(175,222,226,0.26)" />
              <stop offset="100%" stopColor="rgba(111,231,241,0.20)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ✅ 중앙 카드 */}
      <div className="relative z-10 min-h-[100dvh] w-full flex items-center justify-center p-6">
        <div className="w-full max-w-[920px] rounded-3xl bg-[#1b1b22]/70 backdrop-blur-xl border border-[#2d2d2d] shadow-[0_70px_200px_rgba(0,0,0,0.85)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[560px]">
            {/* LEFT */}
            <div className="relative h-full p-8 md:p-10 flex flex-col justify-between">
              <div className="absolute inset-0">
                <div className="h-full w-full bg-gradient-to-br from-[#5fd8e4] via-[#9fd6db] to-[#eef6f6]" />
                <div className="absolute inset-0 bg-black/15" />
                <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-black/20 blur-3xl" />
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
                    bg-white/60
                    hover:bg-white/75
                    transition
                  "
                  onClick={() => navigate("/home")}
                >
                  바로 서비스 이용하기 →
                </button>
              </div>

              {/* (원하면 여기에 슬로건/설명 넣어도 됨) */}
              <div className="relative z-10 mt-10 animate-leftSlide">
                <p className="text-[#2d2d2d] text-3xl md:text-4xl font-semibold leading-tight">
                  Capturing Moments,
                  <br />
                  Creating Memories
                </p>
                <p className="mt-4 text-[#2d2d2d]/70 text-sm md:text-base max-w-[360px]">
                  여기에 서비스 소개 문구/가치제안 넣으면 됨.
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="h-full p-8 md:p-10 bg-[#2d2d2d] flex items-center justify-center">
              <form
                onSubmit={onSubmit}
                className="w-[320px] flex flex-col items-center"
              >
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
                    aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>

                {/* Login */}
                <button
                  type="submit"
                  disabled={!canLogin}
                  className={[
                    "mt-10 w-full h-11 rounded-full text-sm transition",
                    canLogin
                      ? "bg-[#e45a4d] text-[#f6f6f6] hover:brightness-110"
                      : "bg-[#e45a4d]/40 text-white/50 cursor-not-allowed",
                  ].join(" ")}
                >
                  Login
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
                    bg-[#4d4d4d]/80
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

      {/* ✅ 기존 애니메이션 + blob 그대로 */}
      <style>{`
        @keyframes blob1 {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(70px, 40px) scale(1.08); }
          66%  { transform: translate(20px, 90px) scale(0.98); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes blob2 {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-80px, -30px) scale(1.07); }
          66%  { transform: translate(-30px, 60px) scale(0.98); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes blob3 {
          0%   { transform: translate(0,0) scale(1); opacity: .75; }
          50%  { transform: translate(-40px, 30px) scale(1.06); opacity: .95; }
          100% { transform: translate(0,0) scale(1); opacity: .75; }
        }
        .animate-blob1 { animation: blob1 14s ease-in-out infinite; }
        .animate-blob2 { animation: blob2 16s ease-in-out infinite; }
        .animate-blob3 { animation: blob3 18s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
