import { MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious, MdShuffle, MdRepeat, } from "react-icons/md";
import { MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { MdOpenInFull } from "react-icons/md";
import { usePlayer } from "../../player/PlayerContext";

import { useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";


type Props = { height?: number };

const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function Player({ height = 92 }: Props) {
    const navigate = useNavigate();

    const { 
        current, 
        isPlaying, 
        toggle, 
        progress, 
        duration, 
        seek, 
        volume, 
        setVolume,
        shuffleQueue,
        previousTrack,
        nextTrack,
        toggleRepeat,
        repeatMode,
    } = usePlayer();

    const hasTrack = !!current;
    const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

    // 앨범 커버 URL 처리 (상대 경로를 절대 경로로 변환)
    const coverUrl = useMemo(() => {
        if (!current?.coverUrl) return null;
        
        const url = current.coverUrl;
        const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
        
        // 이미 절대 URL이면 그대로 사용
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
            return url;
        }
        
        // 상대 경로인 경우 API_BASE를 사용하여 절대 경로로 변환
        if (API_BASE && url.startsWith("/")) {
            return `${API_BASE.replace("/api/v1", "")}${url}`;
        }
        
        return url;
    }, [current?.coverUrl]);

    const volRef = useRef<HTMLDivElement>(null);

    const setVolumeByClientX = (clientX: number) => {
    const el = volRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setVolume(ratio);
    };

    const startDragVolume = (e: React.PointerEvent<HTMLDivElement>) => {
    // 드래그 시작 시 바로 반영
    setVolumeByClientX(e.clientX);

    // 포인터 캡처: 드래그 중 바 밖으로 나가도 계속 추적
    e.currentTarget.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => setVolumeByClientX(ev.clientX);
    const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    };


    return (
        <div
        className="fixed bottom-0 left-0 right-0 z-[60] border-t border-white/10 bg-[#2b2b2b]/80 backdrop-blur"
        style={{ height }}
        >
        <div className="h-full px-6 flex items-center gap-6">
            {/* 좌: 정보 (재생 전에는 기본값) */}
            <div className="flex items-center gap-3 min-w-[240px]">
            <div className="h-12 w-12 rounded-xl bg-[#777] overflow-hidden relative flex-shrink-0">
                {hasTrack && coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt={current!.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // 이미지 로드 실패 시 회색 배경 표시
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-[#777]" />
                )}
            </div>
            <div className="min-w-0">
                <div className="text-sm text-[#F6F6F6] truncate">
                {hasTrack ? current!.title : "재생할 곡을 선택하세요"}
                </div>
                <div className="text-xs text-[#999] truncate">
                {hasTrack ? current!.artist : "—"}
                </div>
            </div>
            </div>

            {/* 중: 컨트롤 + 진행바 */}
            <div className="flex-1 min-w-0 flex flex-col items-center gap-1">
            <div className="flex items-center gap-4">
            {/* 셔플 */}
            <button
                type="button"
                onClick={shuffleQueue}
                disabled={!hasTrack}
                className={[
                    "transition",
                    hasTrack ? "text-[#999] hover:text-[#F6F6F6]" : "text-white/30 cursor-not-allowed",
                ].join(" ")}
                aria-label="셔플"
                title="재생 대기 곡들 셔플"
            >
                <MdShuffle size={22} />
            </button>

            {/* 이전 */}
            <button
                type="button"
                onClick={previousTrack}
                disabled={!hasTrack}
                className={[
                    "transition",
                    hasTrack ? "text-[#999] hover:text-[#F6F6F6]" : "text-white/30 cursor-not-allowed",
                ].join(" ")}
                aria-label="이전 곡"
                title="이전 곡"
            >
                <MdSkipPrevious size={26} />
            </button>

            {/* 재생 / 일시정지 */}
            <button
                type="button"
                onClick={toggle}
                disabled={!hasTrack}
                className={[
                "h-11 w-11 rounded-full flex items-center justify-center transition",
                hasTrack
                    ? "bg-[#E4524D] text-white hover:brightness-110"
                    : "bg-white/10 text-white/40 cursor-not-allowed",
                ].join(" ")}
                aria-label={isPlaying ? "일시정지" : "재생"}
            >
                {isPlaying ? <MdPause size={26} /> : <MdPlayArrow size={26} />}
            </button>

            {/* 다음 */}
            <button
                type="button"
                onClick={nextTrack}
                disabled={!hasTrack}
                className={[
                    "transition",
                    hasTrack ? "text-[#999] hover:text-[#F6F6F6]" : "text-white/30 cursor-not-allowed",
                ].join(" ")}
                aria-label="다음 곡"
                title="다음 곡"
            >
                <MdSkipNext size={26} />
            </button>

            {/* 반복 */}
            <button
                type="button"
                onClick={toggleRepeat}
                disabled={!hasTrack}
                className={[
                    "transition",
                    hasTrack
                        ? repeatMode === "one"
                            ? "text-[#AFDEE2]"
                            : "text-[#999] hover:text-[#F6F6F6]"
                        : "text-white/30 cursor-not-allowed",
                ].join(" ")}
                aria-label="반복"
                title={repeatMode === "one" ? "한 곡 반복" : "반복 끄기"}
            >
                <MdRepeat size={22} />
            </button>
            </div>

            <div className="w-full max-w-[720px] min-w-[350px] flex items-center gap-3">
                <span className="text-[11px] text-[#999] w-10 text-right">
                {fmt(progress)}
                </span>

                {/* 클릭으로 시크 가능 */}
                <div
                className={[
                    "relative h-1 flex-1 rounded-full",
                    hasTrack ? "bg-white/15 cursor-pointer" : "bg-white/10",
                ].join(" ")}
                onClick={(e) => {
                    if (!hasTrack || duration <= 0) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const ratio = x / rect.width;
                    seek(ratio * duration);
                }}
                >
                <div
                    className="absolute left-0 top-0 h-1 rounded-full bg-white/60"
                    style={{ width: `${pct}%` }}
                />
                {hasTrack && (
                    <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white"
                    style={{ left: `calc(${pct}% - 6px)` }}
                    />
                )}
                </div>

                <span className="text-[11px] text-[#999] w-10">
                {fmt(duration)}
                </span>
            </div>
            </div>

            <div className="min-w-[240px] flex items-center justify-end gap-4 group">
            {/* 볼륨 아이콘 */}
            <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                className="text-[#999] hover:text-[#F6F6F6] transition"
                aria-label="볼륨"
            >
                {volume === 0 ? <MdVolumeOff size={20} /> : <MdVolumeUp size={20} />}
            </button>

            {/* 볼륨 바 */}
            <div
                ref={volRef}
                onPointerDown={startDragVolume}
                className="
                relative w-24 h-1 rounded-full
                bg-white/20 cursor-pointer
                "
                onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, x / rect.width));
                setVolume(ratio);
                }}
            >
                {/* 채워진 부분 */}
                <div
                className="
                    absolute left-0 top-0 h-1 rounded-full
                    bg-white
                    group-hover:bg-[#E4524D]
                    transition-colors
                "
                style={{ width: `${volume * 100}%` }}
                />

                {/* 핸들 */}
                <div
                className="
                    absolute top-1/2 -translate-y-1/2
                    h-3 w-3 rounded-full bg-white
                    opacity-0
                    group-hover:opacity-100
                    transition-opacity
                    pointer-events-none
                "
                style={{ left: `calc(${volume * 100}% - 6px)` }}
                />
            </div>
            </div>
            <button
                type="button"
                onClick={() => navigate("/now-playing")}
                className="text-[#999] hover:text-[#F6F6F6] transition"
                aria-label="플레이어 확대"
                title="플레이어 확대"
                >
                <MdOpenInFull size={18} />
            </button>

            </div>
        </div>
    );
    }
