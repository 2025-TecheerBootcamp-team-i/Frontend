// src/pages/auth/SignUpPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdVisibility,
  MdVisibilityOff,
  MdNavigateBefore,
  MdOutlineMail,
  MdLockOutline,
  MdPersonOutline,
} from "react-icons/md";
import { signup } from "../../api/auth";

let __verticalFloatStyleInjected = false;
function ensureVerticalFloatStyle() {
  if (__verticalFloatStyleInjected) return;
  __verticalFloatStyleInjected = true;

  const style = document.createElement("style");
  style.setAttribute("data-auth-vertical-float", "true");
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

export default function SignUpPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [emailChecking, setEmailChecking] = useState(false);
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "checking" | "ok" | "dup" | "invalid"
  >("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailOk = useMemo(() => {
    if (!email.trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const pwMismatch = useMemo(() => {
    if (!pw || !pw2) return false;
    return pw !== pw2;
  }, [pw, pw2]);

  const pwRules = useMemo(() => {
    const hasLetter = /[A-Za-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[!@#$%^&*()_+\-=\\[\]{}|;:'",.<>/?`~]/.test(pw);
    const isValidLength = pw.length >= 8 && pw.length <= 16;
    return { hasLetter, hasNumber, hasSpecial, isValidLength };
  }, [pw]);

  const pwOk = useMemo(() => {
    if (!pw) return false;
    return pwRules.hasLetter && pwRules.hasNumber && pwRules.hasSpecial && pwRules.isValidLength;
  }, [pw, pwRules]);

  const pwInvalid = pw.length > 0 && !pwOk;
  const pw2Invalid = pw2.length > 0 && pwMismatch;

  const pwRuleText = useMemo(() => {
    if (!pw) return "8-16자리, 문자/숫자/특수기호를 각각 1개 이상 포함해 주세요.";
    const missing: string[] = [];
    if (!pwRules.isValidLength) {
      if (pw.length < 8) missing.push("8자리 이상");
      if (pw.length > 16) missing.push("16자리 이하");
    }
    if (!pwRules.hasLetter) missing.push("문자");
    if (!pwRules.hasNumber) missing.push("숫자");
    if (!pwRules.hasSpecial) missing.push("특수기호");
    if (missing.length === 0) return "";
    return `${missing.join(", ")}가 필요해요.`;
  }, [pw, pwRules]);

  const canSubmit = useMemo(() => {
    const emailDupOk = emailStatus === "ok";
    return emailOk && emailDupOk && !!nickname.trim() && !!pw.trim() && pwOk && !pwMismatch;
  }, [emailOk, emailStatus, nickname, pw, pwOk, pwMismatch]);

  const checkEmailDup = async () => {
    const v = email.trim();
    if (!v) return;
    if (!emailOk) {
      setEmailStatus("invalid");
      return;
    }

    setEmailChecking(true);
    setEmailStatus("checking");
    try {
      await new Promise((r) => setTimeout(r, 600));
      const DUP = ["test@test.com", "admin@admin.com", "aaa@aaa.com"];
      const isDup = DUP.includes(v.toLowerCase());
      setEmailStatus(isDup ? "dup" : "ok");
    } finally {
      setEmailChecking(false);
    }
  };

  useEffect(() => {
    setEmailStatus("idle");
  }, [email]);

  const onSubmit = async () => {
    if (!email.trim()) return alert("이메일을 입력해 주세요.");
    if (!emailOk) return alert("이메일 형식이 올바르지 않습니다.");
    if (emailStatus !== "ok") return alert("이메일 중복 확인을 완료해 주세요.");
    
    if (!nickname.trim()) return alert("닉네임을 입력해 주세요.");

    if (!pw.trim()) return alert("비밀번호를 입력해 주세요.");
    if (!pwOk) return alert("비밀번호는 8-16자리, 문자/숫자/특수기호를 모두 포함해야 합니다.");
    if (pwMismatch) return alert("비밀번호가 일치하지 않습니다.");

    setIsSubmitting(true);
    try {
      await signup({
        email: email.trim(),
        password: pw,
        password_confirm: pw2,
        nickname: nickname.trim(),
      });
      alert("회원가입을 완료했습니다!");
      navigate("/login");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.response?.data?.detail || "회원가입에 실패했습니다.";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    ensureVerticalFloatStyle();
  }, []);

  return (
    // ✅ 배경은 AuthLayout이 깔아주므로 여기서는 "카드만" 렌더
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-6">
      <div className="relative w-full max-w-[920px] rounded-3xl bg-[#1b1b22]/70 backdrop-blur-xl border border-[#2d2d2d] shadow-[0_70px_200px_rgba(0,0,0,0.85)] overflow-hidden">
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
            <div
              className="absolute inset-0"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={{ contentVisibility: "auto" as any }} // ✅ CHANGED
            >
              <div className="h-full w-full bg-gradient-to-br from-[#5fd8e4] via-[#9fd6db] to-[#eef6f6]" />
              <div className="absolute inset-0 bg-black/15" />
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
                Join Us,
                <br />
                Start Your Journey
              </p>
              <p className="mt-4 text-[#2d2d2d]/70 text-sm md:text-base max-w-[360px]">
                회원가입 후 모든 기능을 이용할 수 있어요.
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="h-full p-8 md:p-10 bg-[#3d3d3d]/30 flex items-center justify-center">
            <div className="w-[320px]">
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

              <div className="mt-6 flex flex-col items-center">
                {/* Email */}
                <div className="relative w-full">
                  <label className="w-full text-left block text-[12px] text-white/70 mb-1">
                    Email Address
                  </label>

                  <div className="relative w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
                      <MdOutlineMail size={18} />
                    </div>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email ID@domain.com"
                      className={[
                        `
                        w-full h-11 rounded-md
                        pl-11 pr-[108px]
                        bg-[#3d3d3d]/80
                        text-[#f6f6f6] text-sm
                        placeholder:text-white/40
                        outline-none
                        focus:ring-2
                        `,
                        emailStatus === "dup"
                          ? "ring-2 ring-red-600 focus:ring-red-600"
                          : "focus:ring-white/30",
                      ].join(" ")}
                    />

                    <button
                      type="button"
                      disabled={!email.trim() || !emailOk || emailChecking}
                      onClick={checkEmailDup}
                      className={[
                        "absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-md text-[11px] transition",
                        !email.trim() || !emailOk || emailChecking
                          ? "bg-white/10 text-white/40 cursor-not-allowed"
                          : "bg-white/15 text-white/80 hover:bg-white/20",
                      ].join(" ")}
                    >
                      {emailStatus === "checking"
                        ? "확인중..."
                        : emailStatus === "ok"
                        ? "확인완료"
                        : "중복확인"}
                    </button>
                  </div>

                  {email.trim() && !emailOk && (
                    <p className="mt-2 text-[10px] text-red-500 text-center">
                      이메일 형식이 올바르지 않습니다.
                    </p>
                  )}
                  {emailStatus === "dup" && (
                    <p className="mt-2 text-[10px] text-red-500 text-center">
                      이미 사용 중인 이메일입니다.
                    </p>
                  )}
                  {emailStatus === "ok" && (
                    <p className="mt-2 text-[10px] text-emerald-400 text-center">
                      사용 가능한 이메일입니다.
                    </p>
                  )}
                </div>

                {/* Nickname */}
                <div className="relative w-full mt-4">
                  <label className="w-full text-left block text-[12px] text-white/70 mb-1">
                    Nickname
                  </label>

                  <div className="relative w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
                      <MdPersonOutline size={18} />
                    </div>

                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="닉네임을 입력해 주세요"
                      className="
                        w-full h-11 rounded-md
                        pl-11 pr-4
                        bg-[#3d3d3d]/80
                        text-[#f6f6f6] text-sm
                        placeholder:text-white/40
                        outline-none
                        focus:ring-2
                        focus:ring-white/30
                      "
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="relative w-full mt-4">
                  <label className="w-full text-left block text-[12px] text-white/70 mb-1">
                    Password
                  </label>

                  <div className="relative w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
                      <MdLockOutline size={18} />
                    </div>

                    <input
                      type={showPw ? "text" : "password"}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="8-16자리, 문자/숫자/특수기호 포함"
                      className={[
                        `
                        w-full h-11 rounded-md
                        bg-[#3d3d3d]/80
                        pl-11 pr-11
                        text-[#f6f6f6] text-sm
                        placeholder:text-white/40
                        outline-none
                        focus:ring-2
                        `,
                        pwInvalid
                          ? "ring-2 ring-red-600 focus:ring-red-600"
                          : "focus:ring-white/30",
                      ].join(" ")}
                      autoComplete="new-password"
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

                  <div className="relative w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
                      <MdLockOutline size={18} />
                    </div>

                    <input
                      type={showPw2 ? "text" : "password"}
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      className={[
                        `
                        w-full h-11 pl-11 pr-11 rounded-md
                        bg-[#3d3d3d]/80
                        text-[#f6f6f6] text-sm
                        placeholder:text-white/40
                        outline-none
                        focus:ring-2
                        `,
                        pw2Invalid
                          ? "ring-2 ring-red-600 focus:ring-red-600"
                          : "focus:ring-white/30",
                      ].join(" ")}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPw2((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition"
                      aria-label={showPw2 ? "비밀번호 보기" : "비밀번호 숨기기"}
                    >
                      {showPw2 ? (
                        <MdVisibility size={18} />
                      ) : (
                        <MdVisibilityOff size={18} />
                      )}
                    </button>
                  </div>

                  {pwMismatch && (
                    <p className="mt-2 text-[10px] text-red-500 text-center">
                      비밀번호가 일치하지 않습니다.
                    </p>
                  )}
                </div>

                {/* Sign up */}
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className={[
                    "mt-8 w-full h-12 rounded-full text-sm transition",
                    canSubmit && !isSubmitting
                      ? "bg-[#e45a4d] text-[#f6f6f6] hover:brightness-110"
                      : "bg-[#e45a4d]/40 text-white/50 cursor-not-allowed",
                  ].join(" ")}
                >
                  {isSubmitting ? "처리 중..." : "Sign up"}
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
    </div>
  );
}
