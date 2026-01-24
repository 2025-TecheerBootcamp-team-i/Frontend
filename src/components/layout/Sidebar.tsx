import { MdOutlineNavigateNext } from "react-icons/md";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listAllAiMusic } from "../../api/music";
import { getProfile } from "../../utils/auth";
import { MdPlayArrow } from "react-icons/md";

// Mock Playlists
interface Playlist {
  id: number;
  title: string;
  count: string;
}
const MOCK_PLAYLISTS: Playlist[] = [
  { id: 1, title: "새벽 감성 Lo-Fi", count: "12곡" },
  { id: 2, title: "운동할 때 듣는 팝", count: "24곡" },
  { id: 3, title: "코딩 집중 노동요", count: "8곡" },
];

const PLAYER_H = 85; // ✅ 플레이어 높이(px)

function Sidebar() {
  const navigate = useNavigate();

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


  // ✅ AI 음악 랜덤 배경 이미지
  const [aiBg, setAiBg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchAiBg = async () => {
      try {
        const list = await listAllAiMusic({ is_ai: true });
        if (!alive) return;
        const candidates = list.filter(m => m.album_image || m.album_image_square);
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
    return () => { alive = false; };
  }, []);

  return (
    <aside
      className="
        w-[360px]
        bg-transparent
        backdrop-blur-xl
        border-r border-white/5
        flex flex-col
        sticky top-0
        z-40
      "
      style={{
        height: `calc(100vh - ${PLAYER_H}px)`,
      }}
    >
      {/* ✅ 콘텐츠 상단 정렬 및 간격 통일 */}
      <div className="flex flex-col gap-6 pt-8 pb-12">
        {/* 마이페이지: Original Card Layout */}
        <div
          className="
            w-[84%] mx-auto
            bg-white/[0.05]
            backdrop-blur-2xl
            border border-white/10
            rounded-[40px]
            px-6 py-6
            flex-none
            shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
          "
          style={{
            height: "auto",
            minHeight: "180px",
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#f6f6f6]/50 transition font-semibold text-2xl text-[#F6F6F6]"
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
            <div className="flex flex-col justify-center">
              <span className="text-xl font-medium text-[#F6F6F6]">{profile.name}</span>
            </div>
          </div>

          <div className="mt-6 mb-2 border-b border-white/[0.10]" />

          {/* 나의 플레이리스트 */}
          <div>
            <h3 className="text-sm text-white/60 mb-2 px-1">나의 플레이리스트</h3>
            <div className="flex flex-col gap-1">
              {MOCK_PLAYLISTS.map(pl => (
                <button
                  key={pl.id}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition group"
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-white/20">
                      <MdPlayArrow size={14} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-white/90 font-medium leading-none">{pl.title}</div>
                      <div className="text-[10px] text-white/40 mt-1">{pl.count}</div>
                    </div>
                  </div>
                  <MdOutlineNavigateNext className="text-white/20 group-hover:text-white/60" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI 음악 만들기: Rectangular Bar Visual Card */}
        <button
          onClick={() => navigate("/ai")}
          className="
            w-[84%] mx-auto
            h-[180px]
            bg-[#2C2C2C]
            hover:bg-[#3D3D3D]
            transition-colors
            rounded-[32px]
            p-6
            flex flex-col justify-between
            shadow-[0_4px_12px_rgba(0,0,0,0.4)]
            group
            relative
            overflow-hidden
            shrink-0
          "
          aria-label="AI 음악 만들기"
        >
          {/* ✅ 랜덤 AI 배경 이미지 */}
          {aiBg && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70"
                style={{ backgroundImage: `url('${aiBg}')` }}
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
            </>
          )}

          {/* 텍스트: 상단 표시 */}
          <span className="text-2xl font-bold text-white tracking-tight relative z-10 text-left leading-tight drop-shadow-md">
            AI 음악<br />만들기
          </span>

          {/* 화살표 아이콘: 하단 우측 */}
          <div
            className="
              self-end
              w-12 h-12 
              rounded-full 
              bg-white/20 backdrop-blur-md
              flex items-center justify-center 
              text-white
              group-hover:bg-white/30
              transition
              relative z-10
            "
          >
            <MdOutlineNavigateNext size={28} />
          </div>
        </button>



        {/* 태그 탐험하기: Rectangular Bar Visual Card */}
        <button
          onClick={() => navigate("/canvas")}
          className="
            w-[84%] mx-auto
            h-[180px]
            relative
            rounded-[32px]
            overflow-hidden
            group
            shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
            border border-white/20
            shadow-[0_0_15px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.1)]
            flex flex-col justify-between p-6 items-start text-left
            shrink-0
          "
          aria-label="태그 탐험하기 (캔버스 이동)"
        >
          {/* 배경 이미지 - 스크롤에 반응하여 확대 */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-100 ease-out will-change-transform"
            style={{
              backgroundImage: "url('/images/album_verse_preview.png')",
            }}
          />

          {/* ❄️ 스노우볼 효과: 눈송이 입자 */}
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
              backgroundSize: '355px 355px',
            }}
          />

          {/* ✨ 유리 광택 */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/20 via-transparent to-white/30 opacity-90" />
          <div className="absolute top-4 right-4 w-20 h-12 bg-white/20 blur-[15px] rounded-full pointer-events-none rotate-[-45deg]" />

          {/* 오버레이 */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-500" />

          {/* 텍스트: 상단 표시 */}
          <span className="text-2xl font-bold text-white tracking-tight relative z-10 leading-tight drop-shadow-md">
            태그<br />탐험하기
          </span>

          {/* 화살표 아이콘: 하단 우측 */}
          <div
            className="
              self-end
              w-12 h-12 
              rounded-full 
              bg-white/20 backdrop-blur-md
              flex items-center justify-center 
              text-white
              group-hover:bg-white/30
              transition
              relative z-10
            "
          >
            <MdOutlineNavigateNext size={28} />
          </div>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
