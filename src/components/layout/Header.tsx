import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { logoutClient } from "../../api/auth";

import { TiHome } from "react-icons/ti";
import { IoSearch } from "react-icons/io5";
import { MdLogout } from "react-icons/md";

function Header() {
  const navigate = useNavigate();

  const onLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    logoutClient();
    window.location.href = "/";
  };

  const [query, setQuery] = useState("");
  const [tagMode, setTagMode] = useState(false); // ✅ UI 모드

  const goSearch = () => {
    const q = query.trim();
    if (!q) return;

    // ✅ 결과는 그냥 일반 검색이랑 동일하게 /search?q=...
    // (태그든 일반이든 백엔드에서 알아서 처리한다는 전제)
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const goHome = () => {
    setQuery("");
    setTagMode(false);
    navigate("/home");
  };

  const isLoggedIn = !!localStorage.getItem("access_token");

  return (
    <header
      className="
        relative z-[70] h-20 bg-transparent border-b border-white/10
        flex items-center px-6 gap-4
      "
    >
      <button
        type="button"
        onClick={goHome}
        className="
          w-[50px] h-[50px] rounded-full flex items-center justify-center
          bg-white/[0.05]
          transition hover:bg-white/[0.10]
          text-[#AFDEE2]
          shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
        "
      >
        <TiHome size={25} />
      </button>

      {/* 검색바 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goSearch();
        }}
        className={[
          "w-[400px] h-[50px] flex items-center rounded-full px-4 py-3",
          "bg-white/[0.05]",
          "shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]",
          tagMode ? "ring-1 ring-[#AFDEE2]/40" : "",
        ].join(" ")}
      >
        <button
          type="submit"
          className="hover:text-[#f6f6f6]/50 transition text-[#f6f6f6]/30 translate-x-[-2px]"
          aria-label="검색"
          title="검색"
        >
          <IoSearch size={25} />
        </button>

        {/* ✅ 태그 모드 칩(뱃지) */}
        {tagMode && (
          <div
            className="
              ml-2 mr-1 px-2 h-7 rounded-full
              flex items-center gap-1
              bg-[#AFDEE2]/10 border border-[#AFDEE2]/20
              text-[#AFDEE2] text-xs font-semibold
              select-none
            "
          >
            #
            <span className="text-[#AFDEE2]/70 font-medium">TAG</span>
          </div>
        )}

        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);

            // ✅ "# "가 깨지면 태그 모드 종료
            if (tagMode && !v.startsWith("# ")) {
              setTagMode(false);
            }
          }}
          onKeyDown={(e) => {
            // ✅ "#"(딱 한 글자) 상태에서 스페이스 → 태그 UI ON
            if (e.key === " " && query === "#") {
              e.preventDefault();   // 실제 공백 입력 막음
              setTagMode(true);
              setQuery("# ");       // UX용: 스페이스 들어간 것처럼 보이게
              return;
            }

            // ✅ 태그 모드에서 "# " 상태에서 백스페이스 → 태그 모드 OFF
            if (e.key === "Backspace" && tagMode && query === "# ") {
              e.preventDefault();
              setQuery("#");
              setTagMode(false);
              return;
            }
          }}
          className="
            bg-transparent outline-none text-sm w-full indent-[4px]
            text-[#f6f6f6]/80 placeholder:text-[#f6f6f6]/30
          "
          placeholder={
            tagMode
              ? "태그를 입력하세요 (예: #발라드 #운동 #퇴근길)"
              : "노래 또는 아티스트를 검색하세요"
          }
        />
      </form>

      <div className="flex-1" />

      {isLoggedIn ? (
        <button
          type="button"
          onClick={onLogout}
          className="
            group flex items-center shrink-0 mr-4
            bg-white/5 hover:bg-white/10
            rounded-lg transition-all duration-300 ease-in-out
            w-10 h-10 hover:w-28 overflow-hidden
            shadow-md
          "
        >
          <div className="flex items-center justify-center w-10 h-10 shrink-0">
            <MdLogout size={20} className="text-[#AFDEE2]" />
          </div>
          <span
            className="
              whitespace-nowrap text-sm font-bold text-[#AFDEE2]
              opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75
              pr-2
            "
          >
            Logout
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="
            flex items-center justify-center transition
            text-[#AFDEE2] hover:text-[#87b2b6] text-sm font-medium
          "
        >
          로그인
        </button>
      )}
    </header>
  );
}

export default Header;
