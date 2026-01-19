import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MdFavorite, MdMoreHoriz } from "react-icons/md";
import { MdQueueMusic, MdClose, MdDelete, MdDragIndicator } from "react-icons/md";
import { RiDashboardFill } from "react-icons/ri";
import { GrContract } from "react-icons/gr";
import { usePlayer } from "../../player/PlayerContext";
import {
    isTrackLiked,
    toggleTrackLike,
    subscribePlaylists,
} from "../../mocks/playlistMock";

type LyricLine = { t: number; text: string }; // t = 시작초

export default function NowPlayingPage() {
    const navigate = useNavigate();

    const { current, queue, history, progress, removeFromQueue, moveQueueItem } =
        usePlayer();

    const hasTrack = !!current;

    // ✅ 가사 패널 (bottom sheet)
    const [lyricsOpen, setLyricsOpen] = useState(false);

    // ✅ 임시 가사(나중에 current.id로 연결)
    const LYRICS: LyricLine[] = [
        { t: 0, text: "첫 줄 가사" },
        { t: 6, text: "둘째 줄 가사" },
        { t: 12, text: "셋째 줄 가사" },
        { t: 18, text: "넷째 줄 가사" },
        { t: 24, text: "다섯째 줄 가사" },
        { t: 30, text: "여섯째 줄 가사" },
    ];

    const currentLyricIndex = useMemo(() => {
        const p = Number.isFinite(progress) ? progress : 0;
        let idx = 0;
        for (let i = 0; i < LYRICS.length; i++) {
        if (LYRICS[i].t <= p) idx = i;
        else break;
        }
        return idx;
    }, [progress, LYRICS]);

    // ✅ 좌/우 패널 상태
    const [leftOpen, setLeftOpen] = useState(false); // 분석 대시보드
    const [rightOpen, setRightOpen] = useState(false); // 재생목록

    // ✅ playlists 변화 감지(좋아요 count 반영용)
    const [plTick, setPlTick] = useState(0);
    useEffect(() => subscribePlaylists(() => setPlTick((v) => v + 1)), []);

    const liked = useMemo(() => {
        if (!current) return false;
        return isTrackLiked(current.id);
    }, [current, plTick]);

    const toggleLike = () => {
        if (!current) return;

        toggleTrackLike({
        id: current.id,
        title: current.title,
        artist: current.artist,
        album: current.album,
        duration: current.duration ?? "0:00",
        likeCount: current.likeCount ?? 0,
        });
    };

    const baseLikeCount = current?.likeCount ?? 0;
    const shownLikeCount = liked ? baseLikeCount + 1 : baseLikeCount;

    const [tab, setTab] = useState<"queue" | "history">("queue");
    const list = useMemo(
        () => (tab === "queue" ? queue : history),
        [tab, queue, history]
    );

    // ✅ push 레이아웃
    const LEFT_W = 400;
    const RIGHT_W = 340;

    const leftShift = leftOpen ? LEFT_W : 0;
    const rightShift = rightOpen ? RIGHT_W : 0;

    const toggleLeft = () => {
        setLeftOpen((v) => {
        const next = !v;
        if (next) setRightOpen(false);
        return next;
        });
    };

    const toggleRight = () => {
        setRightOpen((v) => {
        const next = !v;
        if (next) setLeftOpen(false);
        return next;
        });
    };

    const currentLineRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!lyricsOpen) return;
        currentLineRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
        });
    }, [lyricsOpen, currentLyricIndex]);

    // ✅ 드래그앤드롭(핸들만 드래그)
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    // ✅ 핸들에서만 시작하도록: 드래그 시작 시 index 저장
    const handleDragStart = (index: number) => (e: React.DragEvent) => {
        setDragIndex(index);
        setOverIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
    };

    const handleDragEnter = (index: number, isQueue: boolean) => () => {
        if (!isQueue) return;
        if (dragIndex === null) return;
        setOverIndex(index);
    };

    const handleDragOver = (index: number, isQueue: boolean) => (e: React.DragEvent) => {
        if (!isQueue) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverIndex(index);
    };

    const handleDrop = (index: number, isQueue: boolean) => (e: React.DragEvent) => {
        if (!isQueue) return;
        e.preventDefault();

        const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
        const to = index;

        if (Number.isFinite(from) && from !== null && from !== to) {
        moveQueueItem(from, to);
        }

        setDragIndex(null);
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setOverIndex(null);
    };

    return (
        <div className="h-full w-full bg-[#2d2d2d] text-[#F6F6F6] overflow-hidden">
        {/* 상단 바 */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#3d3d3d]">
            {/* 좌측 */}
            <div className="min-w-0">
            <button
                type="button"
                onClick={toggleLeft}
                className={[
                "p-2 rounded-full transition hover:bg-white/10",
                leftOpen ? "text-[#AFDEE2]" : "text-[#F6F6F6]",
                ].join(" ")}
                aria-label="분석 대시보드 토글"
                title="분석 대시보드"
            >
                <RiDashboardFill size={18} />
            </button>
            </div>

            {/* 우측 */}
            <div className="flex items-center gap-2">
            {/* 좋아요 */}
            <button
                type="button"
                onClick={(e) => {
                e.stopPropagation();
                toggleLike();
                }}
                className={[
                "h-11 rounded-2xl",
                "flex items-center gap-2",
                "transition relative",
                liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                ].join(" ")}
                aria-label="좋아요"
                title="좋아요"
            >
                <MdFavorite
                size={22}
                className={liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"}
                />
                <span className="text-sm tabular-nums">
                {shownLikeCount.toLocaleString()}
                </span>
            </button>

            {/* 더보기 */}
            <button
                type="button"
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="더보기"
                title="더보기"
            >
                <MdMoreHoriz size={20} />
            </button>

            {/* 화면 다시 줄이기 */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="뒤로 가기"
                title="뒤로 가기"
            >
                <GrContract size={18} />
            </button>
            </div>
        </div>

        {/* 본문 */}
        <div className="h-[calc(100%-4rem)] relative">
            {/* 중앙 메인 */}
            <div
            className="h-full transition-all duration-300 ease-out"
            style={{ marginLeft: leftShift, marginRight: rightShift }}
            >
            <div className="h-full">
                <div className="h-full pt-4 bg-[#333333] overflow-hidden">
                <div className="h-full flex flex-col items-center justify-center px-6">
                    <div className="w-full max-w-[860px] flex flex-col items-center gap-4">
                    {/* 앨범아트 */}
                    <div className="w-[360px] aspect-square rounded-3xl bg-white/25 border border-white/10 flex items-center justify-center">
                        <span className="text-white/60 text-sm">사진</span>
                    </div>

                    <div className="min-w-0 text-center">
                        <div className="text-lg font-semibold text-[#F6F6F6] truncate">
                        {hasTrack ? current.title : "재생 중인 곡이 없어요"}
                        </div>
                        <div className="mt-1 text-sm text-white/60 truncate">
                        {hasTrack ? current.artist : "—"}
                        </div>
                    </div>

                    {/* 가사 */}
                    <button
                        type="button"
                        onClick={() => {
                        setLyricsOpen(true);
                        setLeftOpen(false);
                        setRightOpen(false);
                        }}
                        className={[
                        "w-[520px]",
                        "transition text-center relative",
                        "hover:opacity-80",
                        ].join(" ")}
                    >
                        <div className="mt-4 text-sm text-[#f6f6f6]/80">
                        전체 가사 보기
                        </div>
                    </button>
                    </div>
                </div>
                </div>
            </div>
            </div>

            {/* 좌측 대시보드 */}
            <aside
            className={[
                "absolute left-0 top-0 h-full bg-[#2f2f2f] border-r border-[#3d3d3d]",
                "transition-transform duration-300 ease-out",
            ].join(" ")}
            style={{
                width: LEFT_W,
                transform: leftOpen ? "translateX(0)" : `translateX(-${LEFT_W}px)`,
            }}
            >
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
                <div className="text-sm font-semibold text-white/80">
                분석 대시보드
                </div>
                <button
                type="button"
                onClick={toggleLeft}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="대시보드 닫기"
                >
                <MdClose size={18} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/80 font-semibold">
                    현재 곡 분석
                </div>
                <div className="mt-2 text-xs text-white/55">
                    BPM / Mood / Energy 같은 카드
                </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/80 font-semibold">
                    최근 청취 패턴
                </div>
                <div className="mt-2 text-xs text-white/55">그래프/요약</div>
                </div>
            </div>
            </aside>

            {/* 우측 재생목록 */}
            <aside
            className="absolute right-0 top-0 h-full bg-[#2f2f2f] border-l border-[#3d3d3d] transition-transform duration-300 ease-out"
            style={{
                width: RIGHT_W,
                transform: rightOpen ? "translateX(0)" : `translateX(${RIGHT_W}px)`,
            }}
            >
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#3d3d3d]">
                <div className="text-sm font-semibold text-white/80">재생목록</div>
                <button
                type="button"
                onClick={toggleRight}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="재생목록 닫기"
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
                    "py-2.5 text-sm transition",
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
                    "py-2.5 text-sm transition",
                    tab === "history"
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5",
                    ].join(" ")}
                >
                    재생 기록
                </button>
                </div>

                <div className="mt-4 border-t border-white/10" />

                {/* 리스트 */}
                <div className="mt-2 pb-6">
                {list.length === 0 ? (
                    <div className="mt-10 text-sm text-white/45 text-center">
                    {tab === "queue"
                        ? "재생 대기 목록이 비어있어요"
                        : "재생 기록이 없어요"}
                    </div>
                ) : (
                    <div className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                    {list.map((t, i) => {
                        const isQueue = tab === "queue";

                        return (
                        <div
                            key={t.id}
                            onDragEnter={handleDragEnter(i, isQueue)}
                            onDragOver={handleDragOver(i, isQueue)}
                            onDrop={handleDrop(i, isQueue)}
                            className={[
                            "w-full transition",
                            "hover:bg-white/5",
                            isQueue ? "select-none" : "",
                            overIndex === i && dragIndex !== null && dragIndex !== i
                                ? "bg-white/10 outline outline-1 outline-white/15"
                                : "",
                            dragIndex === i ? "opacity-60" : "",
                            ].join(" ")}
                        >
                            {/* ✅ 핸들만 draggable */}
                            <div className="grid grid-cols-[28px_44px_1fr_auto] items-center gap-3 px-3 py-3">
                            <div className="flex items-center justify-center text-white/40">
                                {isQueue ? (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    draggable
                                    onDragStart={handleDragStart(i)}
                                    onDragEnd={handleDragEnd}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    className="cursor-grab active:cursor-grabbing"
                                    aria-label="드래그로 순서 변경"
                                    title="드래그로 순서 변경"
                                >
                                    <MdDragIndicator size={20} />
                                </span>
                                ) : null}
                            </div>

                            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/10" />

                            <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">
                                {t.title}
                                </div>
                                <div className="text-xs text-white/60 truncate">
                                {t.artist}
                                </div>
                            </div>

                            {/* ✅ 큐 탭에서만 삭제 */}
                            {isQueue ? (
                                <button
                                type="button"
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    removeFromQueue(t.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition"
                                aria-label="대기 목록에서 삭제"
                                title="대기 목록에서 삭제"
                                >
                                <MdDelete size={18} className="text-white/75" />
                                </button>
                            ) : null}
                            </div>
                        </div>
                        );
                    })}
                    </div>
                )}
                </div>
            </div>
            </aside>

            {/* 손잡이 */}
            {!leftOpen && (
            <button
                type="button"
                onClick={toggleLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-0
                h-24 w-10 rounded-r-2xl bg-white/10 hover:bg-white/15 border border-white/10
                flex items-center justify-center transition"
                aria-label="대시보드 열기"
                title="대시보드 열기"
            >
                <RiDashboardFill size={18} />
            </button>
            )}

            {!rightOpen && (
            <button
                type="button"
                onClick={toggleRight}
                className="absolute right-0 top-1/2 -translate-y-1/2
                h-24 w-10 rounded-l-2xl bg-white/10 hover:bg-white/15 border border-white/10
                flex items-center justify-center transition"
                aria-label="재생목록 열기"
                title="재생목록 열기"
            >
                <MdQueueMusic size={18} />
            </button>
            )}
        </div>

        {/* Lyrics Bottom Sheet */}
        <div
            className={[
            "absolute inset-0 z-50",
            lyricsOpen ? "pointer-events-auto" : "pointer-events-none",
            ].join(" ")}
        >
            <div
            onClick={() => setLyricsOpen(false)}
            className={[
                "absolute inset-0 transition-opacity duration-300",
                lyricsOpen ? "opacity-100 bg-black/55" : "opacity-0",
            ].join(" ")}
            />

            <div
            className={[
                "fixed left-0 right-0 bottom-0",
                "transition-transform duration-300 ease-out",
                lyricsOpen ? "translate-y-0" : "translate-y-full",
            ].join(" ")}
            >
            <div className="mx-auto w-[820px] max-w-[95vw] rounded-t-3xl bg-[#2f2f2f] border border-white/10 overflow-hidden shadow-2xl">
                <div className="relative">
                <div className="pt-3 pb-2 flex items-center justify-center">
                    <div className="h-[4px] w-14 rounded-full bg-white/25" />
                </div>

                <div className="h-12 px-5 flex items-center justify-between border-b border-white/10">
                    <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/85 truncate">
                        가사
                    </div>
                    <div className="text-xs text-white/50 truncate">
                        {hasTrack ? `${current.title} · ${current.artist}` : "—"}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={() => setLyricsOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition"
                    aria-label="가사 닫기"
                    >
                    <MdClose size={18} />
                    </button>
                </div>
                </div>

                <div className="h-[52vh] px-6 py-5 overflow-y-auto">
                <div className="space-y-3">
                    {LYRICS.map((line, i) => {
                    const isCurrent = i === currentLyricIndex;
                    const isPast = i < currentLyricIndex;

                    return (
                        <div
                        key={line.t}
                        ref={isCurrent ? currentLineRef : null}
                        className={[
                            "text-lg leading-8 transition-colors",
                            isCurrent
                            ? "text-[#F6F6F6] font-semibold"
                            : isPast
                            ? "text-white/35"
                            : "text-white/65",
                        ].join(" ")}
                        >
                        {line.text}
                        </div>
                    );
                    })}
                </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    );
}
