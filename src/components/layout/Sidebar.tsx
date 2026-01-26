// src/components/layout/Sidebar.tsx
import { MdOutlineNavigateNext, MdPlayArrow } from "react-icons/md";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaylistDetail } from "../../api/playlist";
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


  const top3 = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (myPlaylists ?? []).map((p: any) => {
      const raw =
        p.coverUrl ??
        p.cover_url ??
        p.cover_image ??
        p.cover ??
        null;
      const coverUrl =
        typeof raw === "string" && raw.trim().length > 0 ? raw : null;

      return {
        id: String(p.id ?? p.playlist_id),
        title: String(p.title ?? "Untitled"),
        count: `${Number(p.item_count ?? p.count ?? 0)}곡`,
        coverUrl,
      };
    });

    return mapped.slice(0, 3);
  }, [myPlaylists]);

  const [coversById, setCoversById] = useState<
    Record<string, { coverUrl: string | null; coverUrls: string[] }>
  >({});

  useEffect(() => {
    let alive = true;

    (async () => {
      const ids = top3.map((p) => p.id);

      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const detail = await getPlaylistDetail(id);

          const covers = (detail.items ?? [])
            .map((it) => it?.music?.album_image ?? it?.music?.album?.cover_image)
            .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

          const unique = Array.from(new Set(covers)).slice(0, 4);

          return {
            id,
            coverUrls: unique.length >= 2 ? unique : [],
            coverUrl: unique.length === 1 ? unique[0] : null,
          };
        })
      );

      if (!alive) return;

      setCoversById((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === "fulfilled") {
            next[r.value.id] = { coverUrl: r.value.coverUrl, coverUrls: r.value.coverUrls };
          }
        }
        return next;
      });
    })().catch((e) => console.error("[Sidebar] getPlaylistDetail failed:", e));

    return () => {
      alive = false;
    };
  }, [top3]);


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
                  width={96}
                  height={96}
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

            <div className="mt-2 flex flex-col">
              {top3.length === 0 ? (
                <div className="px-2 py-3 text-xs text-white/30">
                  아직 플레이리스트가 없어요.
                </div>
              ) : (
                top3.map((pl) => {
                  const detailCover = coversById[pl.id];
                  const coverUrls = detailCover?.coverUrls?.length ? detailCover.coverUrls : [];
                  const coverUrl = detailCover?.coverUrl ?? pl.coverUrl;

                  return (
                    <button
                      key={pl.id}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition group"
                      onClick={() => navigate(`/playlist/${pl.id}`)}
                      type="button"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0">
                          {coverUrls.length ? (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                              {Array.from({ length: 4 }).map((_, idx) => {
                                const src = coverUrls[idx];
                                return src ? (
                                  <img key={idx} src={src} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div key={idx} className="w-full h-full bg-white/5" />
                                );
                              })}
                            </div>
                          ) : coverUrl ? (
                            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50 group-hover:text-white">
                              <MdPlayArrow size={14} />
                            </div>
                          )}
                        </div>

                        <div className="text-left flex-1 min-w-0">
                          <div className="text-sm text-white/90 font-medium leading-none truncate">
                            {pl.title}
                          </div>
                          <div className="text-[10px] text-white/40 mt-1 truncate">{pl.count}</div>
                        </div>
                      </div>

                      <MdOutlineNavigateNext className="text-white/20 group-hover:text-white/60 shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}

export default Sidebar;
