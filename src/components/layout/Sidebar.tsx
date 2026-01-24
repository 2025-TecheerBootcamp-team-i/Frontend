import { MdOutlineNavigateNext } from "react-icons/md";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "../../components/layout/MainLayout";
import { getProfile } from "../../utils/auth";

const PLAYER_H = 85; // ✅ 플레이어 높이(px)

function Sidebar({
  playlists,
  onCreatePlaylist,
}: {
  playlists: Playlist[];
  onCreatePlaylist: () => void;
}) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  // ✅ 프로필 정보 (닉네임 + 사진) 상태로 관리
  const [profile, setProfile] = useState(getProfile());

  // ✅ 프로필 변경 이벤트 리스너
  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getProfile());
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  const handleGenerate = () => {
    const v = prompt.trim();
    if (!v) return;

    navigate(`/ai/create?prompt=${encodeURIComponent(v)}`);
    setPrompt("");
  };

  // =========================
  // ✅ 플레이리스트 가로 스크롤 힌트 (인기 아티스트 구역 방식)
  // =========================
  const plScrollRef = useRef<HTMLDivElement>(null);
  const [plShowLeft, setPlShowLeft] = useState(false);
  const [plShowRight, setPlShowRight] = useState(false);

  const updatePlaylistScrollHint = () => {
    const el = plScrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const canScroll = scrollWidth > clientWidth + 1;

    if (!canScroll) {
      setPlShowLeft(false);
      setPlShowRight(false);
      return;
    }

    setPlShowLeft(scrollLeft > 4);
    setPlShowRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  // playlists가 바뀌면(초기 로드/추가/삭제) 힌트 재계산
  useEffect(() => {
    requestAnimationFrame(updatePlaylistScrollHint);
  }, [playlists.length]);

  // 스크롤/리사이즈 이벤트
  useEffect(() => {
    const el = plScrollRef.current;
    if (!el) return;
  
    // ✅ effect 바디에서 직접 setState 호출 금지 → rAF 콜백에서 실행
    const raf = requestAnimationFrame(() => updatePlaylistScrollHint());
  
    const onScroll = () => updatePlaylistScrollHint();
    const onResize = () => updatePlaylistScrollHint();
  
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
  
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  

  return (
    <aside
      className="
        w-[355px]
        bg-transparent
        border-r border-white/5
        p-4
        flex flex-col
        overflow-hidden
      "
      style={{
        height: `calc(100vh - ${PLAYER_H}px)`,
      }}
    >
      {/* ✅ 스크롤 없음: overflow-y-auto 절대 넣지 말기 */}
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div
          className="
            w-full
            bg-white/[0.05]
            backdrop-blur-2xl
            border border-white/10
            rounded-[40px]
            px-6 py-4
            flex-none
            shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
          "
          style={{
            height: "clamp(340px, 42vh, 400px)", // ✅ 화면 크기에 따라 적당히
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#f6f6f6]/50 transition font-semibold text-lg text-[#F6F6F6]"
            >
              마이페이지
            </button>

            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#f6f6f6]/50 transition mb-2 text-[#F6F6F6]"
              aria-label="마이페이지로 이동"
            >
              <MdOutlineNavigateNext size={30} />
            </button>
          </div>

          <div className="mb-3 border-b border-white/[0.10]" />

          <div className="flex gap-4">
            <div className="w-24 h-24 bg-[#777777] rounded-2xl overflow-hidden">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <span className="mt-1.5 text-base text-[#F6F6F6]">{profile.name}</span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => navigate("/my-playlists")}
              className="mt-3 hover:text-[#f6f6f6]/50 transition font-normal text-base mb-2 text-[#F6F6F6]"
            >
              나의 플레이리스트
            </button>

            <div className="mb-2 border-b border-white/[0.10]" />

            {/* ✅ 여기부터: 스크롤 힌트 레이어 */}
            <div className="relative">
              <div
                ref={plScrollRef}
                className="p-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth"
              >
                <div className="flex gap-3 overflow-visible">
                  {playlists.map((p) => (
                    <button
                      onClick={() => navigate(`/playlist/${p.id}`)}
                      key={p.id}
                      type="button"
                      className="
                        shrink-0
                        w-[clamp(80px,12vh,110px)]
                        h-[clamp(80px,12vh,110px)]
                        rounded-xl overflow-hidden bg-[#777777]
                        hover:scale-[1.03] hover:shadow transition
                        z-10 relative hover:z-30 origin-center
                      "
                      title={p.title}
                    >
                      {p.coverUrl ? (
                        <img
                          src={p.coverUrl}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </button>
                  ))}

                  <button
                    onClick={onCreatePlaylist}
                    type="button"
                    className="
                      shrink-0
                      w-[clamp(80px,12vh,110px)]
                      h-[clamp(80px,12vh,110px)]
                      bg-white/10 rounded-xl hover:bg-white/15
                      text-white/70 transition
                      flex items-center justify-center text-xl
                    "
                    aria-label="플레이리스트 추가"
                    title="플레이리스트 추가"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ✅ 인기 아티스트처럼: 필요할 때만 좌/우 그라데이션 */}
              {plShowLeft && (
                <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-black/20 to-transparent z-20" />
              )}
              {plShowRight && (
                <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-black/20 to-transparent z-20" />
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-white/[0.10]" />

        {/* AI 음악: 남는 공간 먹되, 너무 커지지 않게 clamp */}
        <div
          className="
            w-full
            bg-white/[0.05]
            backdrop-blur-2xl
            border border-white/10
            rounded-[40px]
            px-6 py-4
            flex flex-col
            min-h-0
            shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
            overflow-hidden
          "
          style={{
            height: "clamp(260px, 28vh, 320px)",
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/ai")}
              className="mt-1 hover:text-[#f6f6f6]/50 transition font-semibold text-lg mb-2 text-[#F6F6F6]"
            >
              AI 음악 만들기
            </button>

            <button
              onClick={() => navigate("/ai")}
              className="mt-1 hover:text-[#f6f6f6]/50 transition mb-2 text-[#F6F6F6]"
              aria-label="AI 페이지로 이동"
            >
              <MdOutlineNavigateNext size={30} />
            </button>
          </div>

          <div className="mb-3 border-b border-white/10" />

          <textarea
            maxLength={500}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"프롬프트를 입력하여\n나만의 노래를 만들어보세요!"}
            className="
              w-full
              h-[110px]
              resize-none
              rounded-2xl
              bg-white/5
              px-4 py-3
              placeholder:text-white/20
              text-sm
              text-[#e0e0e0]
              outline-none
              focus:ring-2 focus:ring-white/10
              border border-white/5
            "
          />

          <div className="mt-2 flex justify-between items-center">
            <span className="px-2 text-xs text-[#888888]">
              {prompt.length}/500
            </span>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="
                mt-1
                px-3 py-1.5
                rounded-xl
                text-xs
                bg-[#AFDEE2]
                text-[#1f2a2b]
                hover:bg-[#87B2B6]
                active:scale-[0.97]
                transition
                disabled:bg-[#5f7f83]
                disabled:text-[#cfd8da]
                disabled:cursor-not-allowed
                disabled:active:scale-100
              "
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
