import { useState } from "react";
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


  // TODO: 실제 로그인 API 성공 시에만 이동
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    navigate("/home");
  };



  return (
      <div className="relative min-h-[100dvh] flex items-center justify-center">
 
      {/* ✅ 중앙 폼(카드 없음) */}
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-[340px] flex flex-col items-center"
      >

        {/* ===== ID 입력 (아이콘 포함) ===== */}
        <div className="relative w-full">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
          <MdOutlineMail  size={18} />
          </div>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Email ID"
            className="
              w-full h-12
              rounded-md
              bg-[#777777]
              pl-11 pr-4
              text-sm text-[#f6f6f6]
              placeholder:text-[#f6f6f6]/40
              outline-none
              focus:ring-2 focus:ring-white/70
            "
          />
        </div>

        {/* ===== PW 입력 (아이콘 + 눈 버튼 포함) ===== */}
        <div className="relative w-full mt-3">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f6f6f6]">
            <MdLockOutline size={18} />
          </div>
          <input
            type={showPw ? "password" : "text"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="
              w-full h-12
              rounded-md
              bg-[#777777]/80
              pl-11 pr-11
              text-sm text-[#f6f6f6]
              placeholder:text-[#f6f6f6]/40
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

        {/* ===== Login 버튼 ===== */}
        <button
          type="submit"
          className="
            mt-12
            w-full h-12
            rounded-full
            bg-[#777777]/80
            text-sm text-[#f6f6f6]
            hover:bg-[#8a8a8a]/70
            transition
          "
        >
          Login
        </button>

        {/* ===== 구분선 + 텍스트 (이미지처럼) ===== */}
        <div className="w-full mt-4 flex">
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* ===== Sign up 버튼 ===== */}
          <span className="mt-4 text-[10px] text-white/60 whitespace-nowrap">
            계정이 없으신가요?
          </span>

        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="
            mt-4
            w-full h-12
            rounded-full
            bg-[#777777]/80
            text-sm text-[#f6f6f6]
            hover:bg-[#8a8a8a]/70
            transition
          "
        >
          Sign up
        </button>

        <button 
          type="button"
          onClick={() => navigate("/home")}
           className="
            mt-12
            w-full h-12
            rounded-full
            bg-[#777777]/80
            text-sm text-[#f6f6f6]
            hover:bg-[#8a8a8a]/70
            transition
          ">
          바로 서비스로 들어가기
        </button>

      </form>

        

    </div>
  );
}