import { MdOutlineNavigateNext } from "react-icons/md";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "../../components/layout/MainLayout";
import { createAiSong } from "../../mocks/aiSongMock";

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

  const CURRENT_USER_ID = "me";
  const CURRENT_USER_NAME = "나";

  const handleGenerate = () => {
    const v = prompt.trim();
    if (!v) return;

    createAiSong({
      title: "새 AI 곡",
      desc: "AI로 생성한 곡",
      prompt: v,
      ownerId: CURRENT_USER_ID,
      ownerName: CURRENT_USER_NAME,
      status: "Draft",
    });

    setPrompt("");
    navigate("/my/ai-songs");
  };

  return (
    <aside
      className="
        w-[355px]
        bg-[#2D2D2D]
        border-r border-[#3d3d3d]
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
        {/* 마이페이지: 조금 늘어도 OK, 하지만 넘치면 안 되니까 clamp로 안전하게 */}
        <div
          className="
            w-full
            bg-[#3d3d3d]/80
            rounded-3xl
            px-5 py-4
            flex-none
          "
          style={{
            height: "clamp(320px, 42vh, 400px)", // ✅ 화면 크기에 따라 적당히
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#888] transition font-semibold text-lg text-[#F6F6F6]"
            >
              마이페이지
            </button>

            <button
              onClick={() => navigate("/mypage")}
              className="hover:text-[#888] transition mb-2 text-[#F6F6F6]"
            >
              <MdOutlineNavigateNext size={30} />
            </button>
          </div>

          <div className="mb-3 border-b border-[#464646]" />

          <div className="flex gap-4">
            <div className="w-24 h-24 bg-[#777777] rounded-2xl" />
            <span className="mt-1.5 text-base text-[#F6F6F6]">Name</span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => navigate("/my-playlists")}
              className="mt-3 hover:text-[#888] transition font-normal text-base mb-2 text-[#F6F6F6]"
            >
              나의 플레이리스트
            </button>

            <div className="mb-3 border-b border-[#464646]" />

            <div className="p-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-3">
                {playlists.slice(0, 2).map((p) => (
                  <button
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    key={p.id}
                    type="button"
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#777777] hover:scale-[1.03] hover:shadow transition"
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
                  className="w-10 h-20 bg-[#777777] rounded-xl hover:bg-zinc-400 transition text-[#3D3D3D]"
                  aria-label="플레이리스트 추가"
                  title="플레이리스트 추가"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-[#3D3D3D]" />

        {/* AI 음악: 남는 공간 먹되, 너무 커지지 않게 clamp */}
        <div
          className="
            w-full
            bg-[#3d3d3d]/80
            rounded-3xl
            px-5 py-4
            flex flex-col
            min-h-0
            overflow-hidden
          "
          style={{
            height: "clamp(260px, 28vh, 320px)",
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/ai")}
              className="hover:text-[#888] transition font-semibold text-lg mb-2 text-[#F6F6F6]"
            >
              AI 음악 만들기
            </button>

            <button
              onClick={() => navigate("/ai")}
              className="hover:text-[#888] transition mb-2 text-[#F6F6F6]"
            >
              <MdOutlineNavigateNext size={30} />
            </button>
          </div>

          <div className="mb-3 border-b border-[#464646]" />

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
              bg-[#4D4D4D]
              px-4 py-3
              placeholder:text-[#777777]
              text-sm
              text-[#e0e0e0]
              outline-none
              focus:ring-2 focus:ring-[#666666]
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
