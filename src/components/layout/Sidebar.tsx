import { MdOutlineNavigateNext } from 'react-icons/md';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "../../components/layout/MainLayout";


type AiSong = {
    id: string;
    title: string;
    prompt: string;
    createdAt: string;
};

function Sidebar({
    playlists,
    onCreatePlaylist,
}: {
    playlists: Playlist[];
    onCreatePlaylist: () => void;
}) {
    const navigate = useNavigate();

    const [prompt, setPrompt] = useState("");

    const [myAiSongs, setMyAiSongs] = useState<AiSong[]>([
        { id: "1", title: "Midnight Drive", prompt: "새벽 감성 신스웨이브, 드라이브 느낌", createdAt: "01/09" },
        { id: "2", title: "Coffee Rain", prompt: "카페에서 듣는 로파이, 빗소리", createdAt: "01/08" },
        { id: "3", title: "AI Pop Demo", prompt: "밝은 K-pop 느낌, 후렴 중독적", createdAt: "01/06" },
    ]);
    const handleGenerate = () => {
        const v = prompt.trim();
        if (!v) return;
    
    // 지금은 임시로 목록에 추가만 (나중에 API 연결하면 여기서 요청 보내면 됨)
    const newSong: AiSong = {
        id: String(Date.now()),
        title: `AI Song ${myAiSongs.length + 1}`,
        prompt: v,
        createdAt: "Today"
        };
        setMyAiSongs((prev) => [newSong, ...prev]);
        setPrompt("");
    };


return (
    <aside
    className="
        w-[355px]
        h-screen
        bg-[#f0f0f0]
        border-r 
        p-4 
        flex flex-col 
        gap-4
        min-h-0
        overflow-y-auto
        "
    >
      {/* 마이페이지 */}
    <div
        className="
            w-80 max-h-[380px]
            bg-[#E9E9E9]
            rounded-3xl
            px-5 py-4
            "
    >
        <div
        className="
            flex items-center justify-between"
        >
        <button
            onClick={() => navigate("/mypage")}
            className="
                hover:text-[#888]
                transition
                font-semibold 
                text-lg
                text-[#666666]
                "
        >
        마이페이지
        </button>

        <button
            onClick={() => navigate("/mypage")}
            className="
                hover:text-[#888]
                transition
                mb-2
                text-[#666666]"
        >
            <MdOutlineNavigateNext size={30} />
        </button>
        </div>
        {/* 선 */}
        <div className="mb-3 border-b border-zinc-300" />

        <div
        className="
            flex 
            gap-4"
        >
        <div className="w-24 h-24 bg-[#D9D9D9] rounded-2xl" />
        <span
            className="
                mt-1.5
                text-base
                text-[#666666]
                "
        >
        Name
        </span>
        </div>

        {/* 플레이리스트 */}
        <div>
        <button
            type="button"
            onClick={() => navigate("/my-playlists")}
            className="
                mt-3
                hover:text-[#888]
                transition
                font-normal
                text-base
                mb-2
                text-[#666666]
            "
        >
            나의 플레이리스트
        </button>

          {/* 선 */}
        <div className="mb-3 border-b border-zinc-300" />

        <div
            className="
                p-1 overflow-x-auto overflow-y-hidden
            "
        >
            <div className="flex gap-3">
                {playlists.slice(0, 2).map((p) => (
                    <button
                    onClick={() => navigate(`/playlist/${p.id}`)}
                    key={p.id}
                    type="button"
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#d9d9d9] hover:scale-[1.03] hover:shadow transition"
                    title={p.title}
                    >
                    {p.coverUrl ? (
                        <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover" />
                    ) : null}
                    </button>
                ))}

                <button
                    onClick={onCreatePlaylist}
                    type="button"
                    className="w-10 h-20 bg-zinc-300 rounded-xl hover:bg-zinc-400 transition text-[#666666]"
                    aria-label="플레이리스트 추가"
                    title="플레이리스트 추가"
                    >
                    +
                </button>
            </div>
        </div>
        </div>
    </div>

      {/* 선 */}
    <div className="border-b border-zinc-300" />

      {/* AI 음악 */}
    <div
        className="
            w-full h-[300px]
            bg-[#E9E9E9]
            rounded-3xl
            px-5 py-4
            flex flex-col
            min-h-0
            "
    >
        <div
        className="
                flex items-center justify-between
                "
        >
        <button
            onClick={() => navigate("/ai")}
            className="
                hover:text-[#888]
                transition
                font-semibold 
                text-lg
                mb-2
                text-[#666666]
                "
        >
        AI 음악 만들기
        </button>

        <button
            onClick={() => navigate("/ai")}
            className="
                hover:text-[#888]
                transition
                mb-2
                text-[#666666]"
        >
            <MdOutlineNavigateNext size={30} />
        </button>
        </div>
        <div className="mb-3 border-b border-zinc-300" />

        {/* 프롬프트 입력 */}
        <div className="mb-2">
            <textarea
                maxLength={500}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={"프롬프트를 입력하여\n나만의 노래를 만들어보세요!"}
                className="
                    w-full
                    h-[80px]
                    resize-none
                    rounded-2xl
                    bg-[#F2F2F2]
                    px-4 py-3
                    text-sm
                    text-[#666666]
                    outline-none
                    focus:ring-2 focus:ring-zinc-300
                "
            />

            <div className="flex justify-between">
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
                            bg-zinc-300
                            text-[#666666]
                            hover:bg-zinc-400
                            transition
                            disabled:opacity-40
                            disabled:hover:bg-zinc-300
                    ">
                    Create
                    </button>
            </div>
        </div>


        {/* 내가 만든 AI 노래 목록 */}
        <div className="p-2 min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3">
                {myAiSongs.slice(0, 3).map((s) => (
                <button
                key={s.id}
                type="button"
                className="
                    shrink-0
                    w-20 h-20
                    rounded-2xl
                    bg-[#D9D9D9]
                    hover:scale-[1.03]
                    hover:shadow
                    transition
                    "
                    title={s.title}
                >
                    {/* 커버 이미지 자리 */}
                    {/* 나중에 실제 이미지 오면 img 태그로 교체 */}
                </button>
                ))}
            </div>
            </div>
        </div>
    </aside>
    );
}

export default Sidebar;
