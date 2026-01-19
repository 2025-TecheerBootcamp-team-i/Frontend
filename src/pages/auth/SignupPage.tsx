import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdVisibility, MdVisibilityOff, MdNavigateBefore } from "react-icons/md";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // ✅ 비밀번호 보기/숨기기 토글
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // ✅ 비밀번호 확인 검증
  const pwMismatch = useMemo(() => {
    if (!pw || !pw2) return false;
    return pw !== pw2;
  }, [pw, pw2]);

  // ✅ 비밀번호 규칙 검사 (문자/숫자/특수기호)
  const pwRules = useMemo(() => {
    const hasLetter = /[A-Za-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?\`~]/.test(pw);
    return { hasLetter, hasNumber, hasSpecial };
  }, [pw]);

  // ✅ 규칙 충족 여부
  const pwOk = useMemo(() => {
    if (!pw) return false;
    return pwRules.hasLetter && pwRules.hasNumber && pwRules.hasSpecial;
  }, [pw, pwRules]);

  const pwInvalid = pw.length > 0 && !pwOk;
  const pw2Invalid = pw2.length > 0 && pwMismatch;

  // ✅ 사용자에게 보여줄 규칙 안내 문구
  const pwRuleText = useMemo(() => {
    if (!pw) return "문자/숫자/특수기호를 각각 1개 이상 포함해 주세요.";
    const missing: string[] = [];
    if (!pwRules.hasLetter) missing.push("문자");
    if (!pwRules.hasNumber) missing.push("숫자");
    if (!pwRules.hasSpecial) missing.push("특수기호");
    if (missing.length === 0) return "";
    return `${missing.join(", ")}가 부족해요.`;
  }, [pw, pwRules]);

  const canSubmit = useMemo(() => {
    return !!email.trim() && !!pw.trim() && pwOk && !pwMismatch;
  }, [email, pw, pwOk, pwMismatch]);

  const onSubmit = () => {
    if (!email.trim()) return alert("이메일을 입력해 주세요.");
    if (!pw.trim()) return alert("비밀번호를 입력해 주세요.");

    if (!pwOk) return alert("비밀번호는 문자/숫자/특수기호를 모두 포함해야 합니다.");
    if (pwMismatch) return alert("비밀번호가 일치하지 않습니다.");

    alert("회원가입을 완료했습니다!");
    navigate("/login");
  };

  // ✅ blob 애니메이션 (로그인 페이지랑 통일)
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
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
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* ✅ 배경 (로그인 페이지랑 동일 톤) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1720] via-[#2a4b55] to-[#101018]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_15%,rgba(111,231,241,0.22),transparent_60%),radial-gradient(60%_55%_at_80%_25%,rgba(175,222,226,0.16),transparent_55%)]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 -left-48 h-[560px] w-[560px] rounded-full bg-[#afdee2]/32 blur-3xl animate-blob1" />
        <div className="absolute -bottom-48 -right-44 h-[620px] w-[620px] rounded-full bg-[#afdee2]/24 blur-3xl animate-blob2" />
        <div className="absolute top-1/3 -right-56 h-[420px] w-[420px] rounded-full bg-[#afdee2]/18 blur-3xl animate-blob3" />

        {/* 웨이브 1 */}
        <svg
          className="absolute -bottom-28 left-0 w-[150%] opacity-55"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveBack2)"
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
            <linearGradient id="waveBack2" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(175,222,226,0.22)" />
              <stop offset="55%" stopColor="rgba(111,231,241,0.18)" />
              <stop offset="100%" stopColor="rgba(175,222,226,0.14)" />
            </linearGradient>
          </defs>
        </svg>

        {/* 웨이브 2 */}
        <svg
          className="absolute -bottom-14 left-0 w-[140%] opacity-75"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveFront2)"
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
            <linearGradient id="waveFront2" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(111,231,241,0.30)" />
              <stop offset="50%" stopColor="rgba(175,222,226,0.26)" />
              <stop offset="100%" stopColor="rgba(111,231,241,0.20)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ✅ 가운데 카드 */}
      <div className="relative z-10 min-h-[100dvh] w-full flex items-center justify-center p-6">
        <div className="w-full max-w-[520px] rounded-3xl bg-[#2d2d2d] backdrop-blur-xl border border-[#2d2d2d] shadow-[0_70px_200px_rgba(0,0,0,0.85)] overflow-hidden">
          <div className="p-8 md:p-10">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[#f6f6f6]/90 rounded-full hover:bg-white/10 transition p-1"
                aria-label="뒤로 가기"
                title="뒤로 가기"
              >
                <MdNavigateBefore size={26} />
              </button>
              <div className="text-white/90 font-semibold">Sign up</div>
              <div className="w-[26px]" />
            </div>

            {/* 폼 */}
            <div className="mt-6 flex flex-col items-center">
              {/* Email */}
              <div className="relative w-full">
                <label className="w-full text-left block text-[12px] text-white/70 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email ID@domain.com"
                  className="
                    w-full h-11 rounded-md
                    pl-4 pr-4
                    bg-[#3d3d3d]/80
                    text-[#f6f6f6] text-sm
                    placeholder:text-white/40
                    outline-none
                    focus:ring-2 focus:ring-white/30
                  "
                />
              </div>

              {/* Password */}
              <div className="relative w-full mt-4">
                <label className="w-full text-left block text-[12px] text-white/70 mb-1">
                  Password
                </label>

                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="문자와 숫자, 특수기호 포함"
                  className={[
                    `
                    w-full h-11 rounded-md
                    bg-[#3d3d3d]/80
                    pl-4 pr-11
                    text-[#f6f6f6] text-sm
                    placeholder:text-white/40
                    outline-none
                    focus:ring-2
                    `,
                    pwInvalid ? "ring-2 ring-red-600 focus:ring-red-600" : "focus:ring-white/30",
                  ].join(" ")}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition"
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>

                {pw && !pwOk && (
                  <p className="mt-2 text-[10px] text-red-500 text-center">
                    {pwRuleText}
                  </p>
                )}
              </div>

              {/* Password Check */}
              <div className="relative w-full mt-4">
                <label className="w-full text-left block text-[12px] text-white/70 mb-1">
                  Check your Password
                </label>

                <input
                  type={showPw2 ? "password" : "text"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className={[
                    `
                    w-full h-11 pl-4 pr-11 rounded-md
                    bg-[#3d3d3d]/80
                    text-[#f6f6f6] text-sm
                    placeholder:text-white/40
                    outline-none
                    focus:ring-2
                    `,
                    pw2Invalid ? "ring-2 ring-red-600 focus:ring-red-600" : "focus:ring-white/30",
                  ].join(" ")}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition"
                  aria-label={showPw2 ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPw2 ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>

                {pwMismatch && (
                  <p className="mt-2 text-[10px] text-red-500 text-center">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>

              {/* Sign up 버튼 */}
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className={[
                  `
                  mt-8 w-full h-12 rounded-full
                  text-sm transition
                  `,
                  canSubmit
                    ? "bg-[#e45a4d] text-[#f6f6f6] hover:brightness-110"
                    : "bg-[#e45a4d]/40 text-white/50 cursor-not-allowed",
                ].join(" ")}
              >
                Sign up
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-4 text-[12px] text-white/60 hover:text-white transition"
              >
                이미 계정이 있어요 → 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
