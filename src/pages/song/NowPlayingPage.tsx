    import { useMemo, useState } from "react";
    import { useNavigate } from "react-router-dom";
    import { IoChevronBack } from "react-icons/io5";
    import { MdFavoriteBorder, MdMoreHoriz } from "react-icons/md";
    import { MdQueueMusic, MdClose } from "react-icons/md";
    import { usePlayer } from "../../player/PlayerContext";

    const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    export default function NowPlayingPage() {
    const navigate = useNavigate();

    // ✅ any 제거: PlayerContextValue로 타입 보장됨
    const { current, isPlaying, progress, duration, queue, history } = usePlayer();

    const hasTrack = !!current;

    const [panelOpen, setPanelOpen] = useState(true);
    const [tab, setTab] = useState<"queue" | "history">("queue");

    const list = useMemo(() => {
        return tab === "queue" ? queue : history;
    }, [tab, queue, history]);

    const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

    return (
        <div className="h-full w-full bg-[#2d2d2d] text-[#F6F6F6]">
        {/* 상단 바 */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#3d3d3d]">
            <div className="flex items-center gap-3 min-w-0">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>

            <div className="min-w-0">
                <div className="text-sm text-white/60">노래 재생 시 - 확대</div>
                <div className="text-lg font-semibold truncate">Now Playing</div>
            </div>
            </div>

            {/* 우측 액션 */}
            <div className="flex items-center gap-2">
            <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 transition text-sm"
                aria-label="좋아요"
            >
                <MdFavoriteBorder size={18} />
                <span className="text-white/70">342,234</span>
            </button>

            <button
                type="button"
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="더보기"
            >
                <MdMoreHoriz size={20} />
            </button>

            {/* 재생목록 토글 버튼 */}
            <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition text-sm"
                aria-label="재생목록 토글"
            >
                <MdQueueMusic size={18} />
                <span className="text-white/80">{panelOpen ? "목록 닫기" : "목록 열기"}</span>
            </button>
            </div>
        </div>

        {/* 본문 영역 */}
        <div className="h-[calc(100%-4rem)] flex">
            {/* 왼쪽 메인 */}
            <div className="flex-1 min-w-0">
            <div className="h-full px-6 py-6">
                <div className="h-full rounded-2xl bg-[#333333] border border-[#3d3d3d] relative overflow-hidden">
                {/* 가운데 콘텐츠 */}
                <div className="h-full flex flex-col items-center justify-center gap-6 px-6">
                    {/* 앨범아트 */}
                    <div className="w-[360px] max-w-[70%] aspect-square rounded-3xl bg-white/25 border border-white/10 flex items-center justify-center">
                    <span className="text-white/60 text-sm">사진</span>
                    </div>

                    {/* 곡정보 */}
                    <div className="text-center max-w-[720px] w-full">
                    <div className="text-2xl font-semibold truncate">
                        {hasTrack ? current!.title : "곡 명"}
                    </div>
                    <div className="mt-2 text-white/70 truncate">
                        {hasTrack ? current!.artist : "아티스트명"}
                    </div>
                    <div className="mt-1 text-white/50 text-sm truncate">
                        {hasTrack ? current!.album ?? "앨범명" : "앨범명"}
                    </div>
                    </div>

                    {/* 가사 버튼 */}
                    <button
                    type="button"
                    className="w-[420px] max-w-[80%] h-14 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition text-white/80"
                    >
                    가사
                    </button>

                    {/* 진행바 */}
                    <div className="w-full max-w-[860px] mt-2">
                    <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                        <span>{fmt(progress)}</span>
                        <span>{fmt(duration)}</span>
                    </div>

                    <div className="h-2 rounded-full bg-black/25 overflow-hidden">
                        <div className="h-full bg-white/35" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="mt-2 text-xs text-white/50 text-center">
                        {hasTrack ? (isPlaying ? "재생 중" : "일시정지") : "대기"}
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>

            {/* 오른쪽 슬라이드 패널 */}
            <div className="relative">
            <aside
                className={[
                "h-full w-[360px] bg-[#2f2f2f] border-l border-[#3d3d3d]",
                "transition-transform duration-300 ease-out",
                panelOpen ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
            >
                <div className="h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
                <div className="text-sm font-semibold text-white/80">재생목록</div>
                <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition"
                    aria-label="패널 닫기"
                >
                    <MdClose size={18} />
                </button>
                </div>

                <div className="px-4 pt-4">
                {/* 탭 */}
                <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    <button
                    type="button"
                    onClick={() => setTab("queue")}
                    className={[
                        "py-2 text-sm transition",
                        tab === "queue"
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5",
                    ].join(" ")}
                    >
                    재생 대기
                    </button>
                    <button
                    type="button"
                    onClick={() => setTab("history")}
                    className={[
                        "py-2 text-sm transition",
                        tab === "history"
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5",
                    ].join(" ")}
                    >
                    재생 기록
                    </button>
                </div>

                {/* 헤더 */}
                <div className="mt-4 text-xs text-white/50 grid grid-cols-[44px_1fr] px-1">
                    <div />
                    <div className="flex justify-between">
                    <span>곡명</span>
                    <span>아티스트명</span>
                    </div>
                </div>

                {/* 리스트 */}
                <div className="mt-3 space-y-2 pb-6">
                    {list.length === 0 ? (
                    <div className="mt-8 text-sm text-white/45 text-center">
                        {tab === "queue"
                        ? "재생 대기 목록이 비어있어요"
                        : "재생 기록이 없어요"}
                    </div>
                    ) : (
                    list.map((t) => (
                        <button
                        key={t.id}
                        type="button"
                        className="w-full text-left rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition px-3 py-3"
                        >
                        <div className="grid grid-cols-[44px_1fr] gap-3 items-center">
                            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/10" />
                            <div className="min-w-0">
                            <div className="flex items-center justify-between gap-3">
                                <div className="font-semibold text-sm truncate">{t.title}</div>
                                <div className="text-xs text-white/60 truncate max-w-[45%] text-right">
                                {t.artist}
                                </div>
                            </div>
                            <div className="mt-1 text-xs text-white/45 truncate">
                                {t.album ?? "앨범명"}
                            </div>
                            </div>
                        </div>
                        </button>
                    ))
                    )}
                </div>
                </div>
            </aside>

            {/* 패널 닫혔을 때 손잡이 */}
            {!panelOpen && (
                <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-full
                            h-24 w-10 rounded-l-2xl bg-white/10 hover:bg-white/15 border border-white/10
                            flex items-center justify-center transition"
                aria-label="재생목록 열기"
                title="재생목록 열기"
                >
                <MdQueueMusic size={18} />
                </button>
            )}
            </div>
        </div>
        </div>
    );
    }
