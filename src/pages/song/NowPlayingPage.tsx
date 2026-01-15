import { useNavigate } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import { usePlayer } from "../../player/PlayerContext";

const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function NowPlayingPage() {
    const navigate = useNavigate();
    const { current, isPlaying, progress, duration } = usePlayer();

    const hasTrack = !!current;

    return (
        <div className="w-full h-full px-6 py-5 text-[#F6F6F6]">
        {/* 상단 */}
        <div className="flex items-center gap-3">
            <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 transition"
            aria-label="뒤로가기"
            >
            <IoChevronBack size={22} />
            </button>
            <h1 className="text-xl font-semibold">Now Playing</h1>
        </div>

        {/* 본문 */}
        <div className="mt-8 grid grid-cols-12 gap-8 items-start">
            {/* 앨범아트 크게 */}
            <div className="col-span-5">
            <div className="w-full aspect-square rounded-3xl bg-white/10 border border-white/10" />
            </div>

            {/* 정보 */}
            <div className="col-span-7">
            <div className="text-3xl font-semibold truncate">
                {hasTrack ? current!.title : "재생 중인 곡이 없습니다"}
            </div>
            <div className="mt-2 text-[#999] text-lg truncate">
                {hasTrack ? current!.artist : "곡을 선택해 주세요"}
            </div>

            {/* 진행 정보 */}
            <div className="mt-8 flex items-center justify-between text-sm text-[#999]">
                <span>{fmt(progress)}</span>
                <span>{fmt(duration)}</span>
            </div>

            {/* 상태 표시 */}
            <div className="mt-3 text-sm text-[#999]">
                {hasTrack ? (isPlaying ? "재생 중" : "일시정지") : "대기"}
            </div>

            {/* (나중에) 가사/추천/큐 같은 영역 */}
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#999]">
                이 페이지는 다시 새로 만들겁니당
            </div>
            </div>
        </div>
        </div>
    );
}
