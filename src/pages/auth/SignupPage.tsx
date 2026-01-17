import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";


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
    // "특수기호"를 영문/숫자/공백 제외 문자로 정의
    const hasSpecial = /[^A-Za-z0-9\s]/.test(pw);

    return { hasLetter, hasNumber, hasSpecial };
  }, [pw]);

    // ✅ 규칙 충족 여부
  const pwOk = useMemo(() => {
    // 비번이 비어있을 때는 에러로 띄우기 애매하니 false 처리만 (UI는 별도 조건으로)
    if (!pw) return false;
    return pwRules.hasLetter && pwRules.hasNumber && pwRules.hasSpecial;
  }, [pw, pwRules]);

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
    // 실제 회원가입 API 붙이기 전 단계에서는 최소 검증만
    if (!email.trim()) return alert("이메일을 입력해 주세요.");
    if (!pw.trim()) return alert("비밀번호를 입력해 주세요.");
    if (pwMismatch) return alert("비밀번호가 일치하지 않습니다.");

    // TODO: 백엔드 회원가입 API 호출
    // await fetch("/api/signup", { ... })

   // ✅ 여기서 규칙 미충족이면 '가입 불가'
    if (!pwOk) return alert("비밀번호는 문자/숫자/특수기호를 모두 포함해야 합니다.");
    if (pwMismatch) return alert("비밀번호가 일치하지 않습니다.");

    alert("회원가입을 완료했습니다!");
    navigate("/login");
  };

  return (
   <div className="min-h-screen overflow-hidden flex items-center justify-center">

      <div
        className="
          pointer-events-none absolute inset-0
          bg-[linear-gradient(180deg,#2D2D2D_30%,#5D5D5D_100%)]
          bg-[length:200%_200%]
          animate-bgGradient
        "
      />
      
      {/* ✅ 폼: 가운데 정렬 + 폭 고정 (버튼 기준) */}
      <div className="relative z-10 w-[340px]">
        
        {/* Email */}
        <label className="w-full text-left block text-[10px] text-white/70 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email ID@domain.com"
          className="
            w-full h-12
            px-4
            rounded-full
            bg-[#777777]/80
            text-[#f6f6f6] text-sm
            placeholder:text-white/40
            outline-none
            focus:ring-2 focus:ring-white/70
          "
        />

        {/* Password */}
        <div className="h-2" />
        <label className="w-full text-left block text-[10px] text-white/70 mb-1">
          Password
        </label>

        <div className="relative">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="문자와 숫자, 특수기호 포함"
            className="
              w-full h-12
              px-4
              rounded-full
              bg-[#777777]/80
              text-[#f6f6f6] text-sm
              placeholder:text-white/70
              outline-none
              focus:ring-2 focus:ring-white/70
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

        {/* ✅ 규칙 안내 문구 */}
        {pw && !pwOk && (
          <p className="mt-2 text-[10px] text-red-600 text-center">{pwRuleText}</p>
        )}

        {/* Password Check */}
        <div className="h-4" />
        <label className="w-full text-left block text-[10px] text-white/70 mb-1">
          Check your Password
        </label>

        <div className="relative">
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className={[
              `
              w-full h-12
              px-4
              rounded-full
              bg-[#777777]/80
              text-white/90 text-sm
              placeholder:text-white/70
              outline-none
              focus:ring-2 focus:ring-white/70
              `,
              pwMismatch ? "ring-2 ring-red-600" : "",
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
        </div>

        {pwMismatch && (
          <p className="flex flex-1 justify-center mt-2 text-[10px] text-red-600">
            비밀번호가 일치하지 않습니다.
          </p>
        )}
          
        {/* Sign up 버튼 */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            `
            mt-8 block mx-auto w-[220px] h-12 rounded-full
            bg-[#777777]/80 text-white text-sm
            transition
            `,
            canSubmit ? "hover:bg-[#8a8a8a]/70" : "opacity-40 cursor-not-allowed",
          ].join(" ")}
        >
          Sign up
        </button>
      </div>
    </div>
  );
}