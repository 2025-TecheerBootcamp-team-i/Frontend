    // src/player/PlayerContext.tsx
    import React, { createContext, useContext, useMemo, useState } from "react";

    export type PlayerTrack = {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration?: string;
    };

    export type PlayerContextValue = {
    current: PlayerTrack | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    queue: PlayerTrack[];
    history: PlayerTrack[];

    // (옵션) 나중에 Player 컴포넌트에서 쓰면 좋음
    toggle: () => void;
    seek: (sec: number) => void;
    };

    const PlayerContext = createContext<PlayerContextValue | null>(null);

    export function usePlayer(): PlayerContextValue {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
    return ctx;
    }

    // ✅ Provider를 꼭 export
    export function PlayerProvider({ children }: { children: React.ReactNode }) {
    // 최소 더미 상태 (나중에 실제 플레이 로직으로 교체)
    const [current] = useState<PlayerTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration] = useState(0);

    const [queue] = useState<PlayerTrack[]>([]);
    const [history] = useState<PlayerTrack[]>([]);

    const value = useMemo<PlayerContextValue>(
        () => ({
        current,
        isPlaying,
        progress,
        duration,
        queue,
        history,
        toggle: () => setIsPlaying((v) => !v),
        seek: (sec: number) => setProgress(sec),
        }),
        [current, isPlaying, progress, duration, queue, history]
    );

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
    }
