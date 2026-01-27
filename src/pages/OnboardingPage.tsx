// src/pages/OnboardingPage.tsx
import { useNavigate } from "react-router-dom";
import logo5 from "../assets/logo5.png";

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[100dvh] flex items-center">
      {/* ✅ 콘텐츠: 왼쪽 중앙 */}
      <div className="px-12 max-w-[420px] translate-x-[6vw] translate-y-[-2vh]">
        {/* 로고 */}
        <div className="mb-6">
          <img src={logo5} alt="muniverse" className="h-20 w-auto opacity-90 object-contain" />
        </div>

        {/* 문구 */}
        <div className="text-white/90 text-3xl font-semibold tracking-tight leading-snug">
          당신의 취향으로
          <br />
          완성되는 음악 세계
        </div>

        <div className="mt-4 text-white/70 text-sm leading-relaxed">
          노래를 만들고, 플레이리스트로 정리하고,
          <br />
          지금 바로 재생하세요.
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="
            mt-8
            h-12 px-8
            rounded-full
            bg-[#E4524D]
            text-white
            font-medium
            transition-colors
            hover:bg-[#d94a45]
          "
        >
          시작하기
        </button>

        <div className="mt-3 text-xs text-white/40">
          계속 진행하면 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </div>
      </div>
    </div>
  );
}
