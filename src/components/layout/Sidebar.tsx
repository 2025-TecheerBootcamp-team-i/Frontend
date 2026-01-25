// src/components/layout/Sidebar.tsx
import { MdOutlineNavigateNext, MdPlayArrow } from "react-icons/md";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listAllAiMusic } from "../../api/music";
import { getProfile } from "../../utils/auth";
import { usePlaylists } from "../../contexts/PlaylistContext";

const PLAYER_H = 85; // ✅ 플레이어 높이(px)

function Sidebar() {
  const navigate = useNavigate();

  // ✅ 진짜 플레이리스트(컨텍스트)
  const { myPlaylists, createPlaylist } = usePlaylists();
  const handleCreatePlaylist = async () => {
    await createPlaylist();
  };  

  // ✅ 프로필 정보 (닉네임 + 사진)
  const [profile, setProfile] = useState(getProfile());

  useEffect(() => {
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  // ✅ AI 음악 랜덤 배경 이미지
  const [aiBg, setAiBg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchAiBg = async () => {
      try {
        const list = await listAllAiMusic({ is_ai: true });
        if (!alive) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidates = list.filter((m: any) => m.album_image || m.album_image_square);
        if (candidates.length > 0) {
          const randomIdx = Math.floor(Math.random() * candidates.length);
          const picked = candidates[randomIdx];
          setAiBg(picked.album_image || picked.album_image_square);
        }
      } catch (e) {
        console.error("Failed to load AI background:", e);
      }
    };

    fetchAiBg();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ Sidebar용 플레이리스트 매핑 + 상위 3개만
  const top3 = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (myPlaylists ?? []).map((p: any) => ({
      id: String(p.id ?? p.playlist_id),
      title: String(p.title ?? "Untitled"),
      count: `${Number(p.item_count ?? p.count ?? 0)}곡`,
      coverUrl: p.coverUrl ?? p.cover_url ?? p.cover_image ?? p.cover ?? null,
    }));

    return mapped.slice(0, 3);
  }, [myPlaylists]);

  // ✅ 공통 카드(마이페이지 규격) 클래스
  const cardClass = `
    w-full mx-auto
    bg-white/[0.05]
    backdrop-blur-2xl
    border border-white/10
    rounded-[40px]
    px-6 py-6
    flex-none
    shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
    relative
    overflow-hidden
  `;

  return (
    <aside
      className="
        w-[360px]
        flex-none shrink-0
        bg-transparent
        backdrop-blur-xl
        border-r border-white/5
        flex flex-col
        sticky top-0
        z-40
        overflow-y-auto
        overscroll-contain
        no-scrollbar
      "
      style={{
        height: `calc(100vh - ${PLAYER_H}px)`,
      }}
    >
      <div className="flex flex-col gap-4 px-4 pt-4 pb-12">
        {/* =========================
            마이페이지 카드
        ========================= */}
        <div className={cardClass} style={{ minHeight: "180px" }}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#f6f6f6]/50 mb-2 transition font-semibold text-2xl text-[#F6F6F6]"
            >
              마이페이지
            </button>

            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#f6f6f6]/50 transition mb-2 text-[#F6F6F6]"
              aria-label="마이페이지로 이동"
              type="button"
            >
              <MdOutlineNavigateNext size={30} />
            </button>
          </div>

          <div className="mb-4 border-b border-white/[0.10]" />

          {/* ✅ 프로필: 이름 위로 정렬 */}
          <div className="flex gap-4 items-start">
            <div className="w-24 h-24 bg-[#777777] rounded-2xl overflow-hidden shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="flex flex-col items-start justify-start pt-1 min-w-0">
              <span className="text-xl font-medium text-[#F6F6F6] leading-tight truncate">
                {profile.name}
              </span>
            </div>
          </div>

          <div className="mt-4 mb-2 border-b border-white/[0.10]" />

          {/* ✅ 나의 플레이리스트: 버튼 + 상위 3개만 */}
          <div>
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => navigate("/my-playlists")}
                className="text-sm text-white/60 hover:text-white/80 transition"
              >
                나의 플레이리스트
              </button>

              <button
                type="button"
                onClick={handleCreatePlaylist}
                className="text-[11px] text-white/50 hover:text-white/80 transition"
                aria-label="플레이리스트 만들기"
                title="플레이리스트 만들기"
              >
                + 추가
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              {top3.length === 0 ? (
                <div className="px-2 py-3 text-xs text-white/30">
                  아직 플레이리스트가 없어요.
                </div>
              ) : (
                top3.map((pl) => (
                  <button
                    key={pl.id}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition group"
                    onClick={() => navigate(`/playlist/${pl.id}`)}
                    type="button"
                  >
                    {/* ✅ 긴 제목 깨짐 방지 */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-white/20 shrink-0">
                        <MdPlayArrow size={14} />
                      </div>

                      <div className="text-left flex-1 min-w-0">
                        <div className="text-sm text-white/90 font-medium leading-none truncate">
                          {pl.title}
                        </div>
                        <div className="text-[10px] text-white/40 mt-1 truncate">
                          {pl.count}
                        </div>
                      </div>
                    </div>

                    <MdOutlineNavigateNext className="text-white/20 group-hover:text-white/60 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* =========================
            AI 음악 만들기 (마이페이지 카드 규격에 맞춤)
        ========================= */}
        <button
          onClick={() => navigate("/ai")}
          className={`${cardClass} text-left group`}
          style={{ minHeight: "180px" }}
          aria-label="AI 음악 만들기"
          type="button"
        >
          {/* ✅ 랜덤 AI 배경 이미지 */}
          {aiBg && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70"
                style={{ backgroundImage: `url('${aiBg}')` }}
              />
              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition-colors" />
            </>
          )}

          {/* 콘텐츠 */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
                AI 음악
                <br />
                만들기
              </span>

              <div
                className="
                  w-12 h-12
                  rounded-full
                  bg-white/20 backdrop-blur-md
                  flex items-center justify-center
                  text-white
                  group-hover:bg-white/30
                  transition
                "
              >
                <MdOutlineNavigateNext size={28} />
              </div>
            </div>
          </div>
        </button>

        {/* =========================
            태그 탐험하기 (마이페이지 카드 규격에 맞춤)
        ========================= */}
        <button
          onClick={() => navigate("/canvas")}
          className={`${cardClass} text-left group`}
          style={{ minHeight: "180px" }}
          aria-label="태그 탐험하기 (캔버스 이동)"
          type="button"
        >
          {/* 배경 이미지 */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.05] opacity-70"
            style={{ backgroundImage: "url('/images/album_verse_preview.png')" }}
          />

          {/* ❄️ 스노우볼 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              backgroundImage: `
                radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                radial-gradient(2px 2px at 40px 70px, #fff, transparent),
                radial-gradient(2px 2px at 60px 40px, #fff, transparent),
                radial-gradient(2px 2px at 80px 120px, #fff, transparent),
                radial-gradient(2px 2px at 100px 50px, #fff, transparent),
                radial-gradient(2px 2px at 150px 150px, #fff, transparent),
                radial-gradient(3px 3px at 200px 100px, rgba(255,255,255,0.8), transparent),
                radial-gradient(2px 2px at 250px 200px, #fff, transparent),
                radial-gradient(2px 2px at 300px 80px, #fff, transparent)
              `,
              backgroundSize: "355px 355px",
            }}
          />

          {/* 유리 광택 + 오버레이 */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/25 via-transparent to-white/25 opacity-90" />
          <div className="absolute top-4 right-4 w-20 h-12 bg-white/20 blur-[15px] rounded-full pointer-events-none rotate-[-45deg]" />
          <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition duration-500" />

          {/* 콘텐츠 */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
                태그
                <br />
                탐험하기
              </span>

              <div
                className="
                  w-12 h-12
                  rounded-full
                  bg-white/20 backdrop-blur-md
                  flex items-center justify-center
                  text-white
                  group-hover:bg-white/30
                  transition
                "
              >
                <MdOutlineNavigateNext size={28} />
              </div>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
