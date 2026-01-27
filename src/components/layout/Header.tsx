import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { logoutClient } from "../../api/auth";
import { getProfile } from "../../utils/auth";

import logo5 from "../../assets/logo5.png"; // ✅ 로고 추가

import { TiHome } from "react-icons/ti";
import { IoSearch } from "react-icons/io5";
import { MdLogout } from "react-icons/md";
import { FaUser } from "react-icons/fa";

function Header() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(getProfile());

  useEffect(() => {
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  const onLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    logoutClient();
    window.location.href = "/";
  };

  const [query, setQuery] = useState("");
  const [tagMode, setTagMode] = useState(false);

  const goSearch = () => {
    const q = query.trim();
    if (!q) return;
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
        flex items-center px-4
      "
    >
      {/* =========================
          [0] 좌측: 홈 버튼 + 로고
      ========================= */}
      <div className="flex items-center gap-4">

        <button
          type="button"
          onClick={goHome}
          className="hidden lg:flex flex items-center justify-center ml-0 translate-y-[4px] transition" // ✅ 잘림 방지 (ml-0)
          aria-label="MuniVerse 홈"
          title="MuniVerse"
        >
          <img
            src={logo5}
            alt="muniverse"
            className="
              h-10 w-auto
              block
              select-none
              drop-shadow-[0_0_8px_rgba(175,222,226,0.25)]
              saturate-50
            "
            draggable={false}
          />
        </button>
      </div>


      {/* =========================
          [1] 중앙: 검색바만
          (absolute로 정중앙 배치)
      ========================= */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-3">
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
            aria-label="홈"
            title="홈"
          >
            <TiHome size={25} />
          </button>
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
                if (tagMode && !v.startsWith("# ")) setTagMode(false);
              }}
              onKeyDown={(e) => {
                if (e.key === " " && query === "#") {
                  e.preventDefault();
                  setTagMode(true);
                  setQuery("# ");
                  return;
                }
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
        </div>
      </div>

      {/* =========================
          [2] 우측: 마이페이지 + 로그아웃
      ========================= */}
      <div className="ml-auto flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <button
              onClick={() => navigate("/mypage")}
              className="
                group flex items-center shrink-0
                bg-white/5 hover:bg-white/10
                shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
                rounded-full transition-all duration-300 ease-in-out
                w-[50px] hover:w-[130px] h-[50px] overflow-hidden
              "
              title="마이페이지"
            >
              <div className="flex items-center justify-center w-[50px] h-[50px] shrink-0">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <FaUser size={20} className="text-[#AFDEE2]" />
                )}
              </div>
              <span
                className={`
                  flex-1 text-center
                  whitespace-nowrap text-base font-bold text-[#AFDEE2]
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75
                  pr-4 translate-y-[-1px]
                  ${profile.avatar ? "ml-2" : ""}
                `}
              >
                my page
              </span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="
                group flex items-center shrink-0
                bg-white/5 hover:bg-white/10
                shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
                rounded-full transition-all duration-300 ease-in-out
                w-[50px] hover:w-[120px] h-[50px] overflow-hidden
              "
              title="로그아웃"
            >
              <div className="flex items-center justify-center w-[52px] h-[50px] shrink-0">
                <MdLogout size={22} className="text-[#AFDEE2]" />
              </div>
              <span
                className="
                  flex-1 text-center items-center
                  whitespace-nowrap text-base font-bold text-[#AFDEE2]
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75
                  pr-4
                "
              >
                Logout
              </span>
            </button>
          </>
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
      </div>
    </header>
  );
}

export default Header;
