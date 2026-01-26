// src/pages/profile/MyAiSongs.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { IoChevronBack } from "react-icons/io5";

import { fetchUserAiMusic } from "../../api/user";
import { getCurrentUserId } from "../../utils/auth";

type CardItem = {
  id: string;
  title: string;
  status: "Upload" | "Draft";
  coverUrl?: string;
};

export default function MyAiSongs() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAiMusic = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setError("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserAiMusic(userId);

        const mapped: CardItem[] = [...data]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((music) => ({
            id: music.music_id.toString(),
            title: music.music_name || "제목 없음",
            status: music.audio_url ? "Upload" : "Draft",
            coverUrl: music.album_image_square || undefined,
          }));

        setItems(mapped);
      } catch (err) {
        console.error("AI 음악 목록 조회 실패:", err);
        setError("AI 음악 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadAiMusic();
  }, []);

  // ✅ 가로 5개 + 글자 한 단계 키움(다른 페이지 톤 맞춤)
  const gridClass = useMemo(
    () => `
      grid
      gap-x-6
      gap-y-12
      justify-between
      [grid-template-columns:repeat(5,220px)]
    `,
    []
  );

  const goCreate = () => navigate("/ai/create");
  const goBack = () => navigate(-1);

  return (
    <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10">
      {/* 헤더 */}
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="
              w-10 h-10
              text-[#f6f6f6] grid place-items-center hover:text-[#f6f6f6]/50
              text-2xl font-semibold
              transition-all
            "
            aria-label="뒤로가기"
            title="뒤로가기"
          >
            <IoChevronBack size={24} />
          </button>

          <div className="text-2xl font-bold text-[#f6f6f6]">나의 AI 생성곡</div>
        </div>

        <button
          type="button"
          onClick={goCreate}
          className="
            w-10 h-10 rounded-full
            border border-[#f6f6f6]/10 bg-[#f6f6f6]/5
            text-[#f6f6f6]/40 grid place-items-center
            hover:bg-[#f6f6f6]/10 hover:text-[#AFDEE2]
            transition-all
          "
          aria-label="AI 곡 만들기"
          title="AI 곡 만들기"
        >
          <FaPlus size={18} />
        </button>
      </div>

      <div className="mb-4 mx-4 border-b border-white/10" />

      <div className="px-6 pb-6 overflow-x-auto">
        {loading ? (
          <div className="py-10 text-base text-white/60 text-center">로딩 중...</div>
        ) : error ? (
          <div className="py-10 text-base text-red-400 text-center">{error}</div>
        ) : (
          <div className={gridClass}>
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/aisong/${it.id}`)}
                className="w-[220px] text-left group"
              >
                {/* 카드 */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/20 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
                  {it.coverUrl ? (
                    <>
                      <img
                        src={it.coverUrl}
                        alt=""
                        className="
                          absolute inset-0 h-full w-full object-cover
                          opacity-90 group-hover:opacity-100 transition-opacity
                          group-hover:scale-110 transition-transform duration-1000
                        "
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  )}

                  {/* 상태 뱃지 (한 단계 키움) */}
                  <div
                    className={[
                      "absolute left-3 top-3 px-2.5 py-1 rounded-full text-xs border backdrop-blur",
                      it.status === "Upload"
                        ? "border-[#AFDEE2]/60 bg-[#AFDEE2]/20 text-[#AFDEE2]"
                        : "border-white/15 bg-black/20 text-white/70",
                    ].join(" ")}
                  >
                    {it.status}
                  </div>
                </div>

                {/* 제목만 (한 단계 키움) */}
                <div className="mx-1 mt-3">
                  <div className="text-base font-semibold text-white/95 truncate group-hover:text-[#AFDEE2] transition-colors">
                    {it.title}
                  </div>
                </div>
              </button>
            ))}

            {items.length === 0 && (
              <div className="col-span-full py-10 text-base text-white/60 text-center">
                아직 만든 AI 곡이 없어요. AI로 멋진 곡을 만들어보세요!
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
